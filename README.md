# Async Local Storage

This document is an explainer for a potential future web platform feature, "async local storage". It's like [`localStorage`](https://html.spec.whatwg.org/multipage/webstorage.html#webstorage), but async!

## Sample code

(Note: the `import` syntax used here presumes this would be implemented as a [permafill](https://github.com/drufball/permafills), and is [still tentative](https://docs.google.com/document/d/1jRQjQP8DmV7RL75u_67ps3SB1sjfa1bFZmbCMfJCvrM/edit?usp=sharing).)

```js
import { storage } from "browser:async-local-storage|https://somecdn.com/async-local-storage.js";

(async () => {
  await storage.set("mycat", "Tom");
  console.assert(await storage.get("mycat") === "Tom");

  console.log(await storage.entries());
  // Logs [["mycat", "Tom"]]

  await storage.delete("mycat");
  console.assert(await storage.get("mycat") === undefined);
})();
```

## Motivation

Local storage is a well-known and well-loved API. It only has one problem: it's synchronous. This leads to [terrible performance](https://hacks.mozilla.org/2012/03/there-is-no-simple-solution-for-local-storage/) and cross-window synchronization issues.

The well-known alternative is IndexedDB. IndexedDB is, however, quite hard to use. It has no simple key/value layer, instead requiring understanding concepts like database upgrades and transactions. Its API is also quite dated; it does not use promises, but instead `IDBRequest` objects with their `onsuccess` and `onerror` methods.

In the face of this, a cottage industry of solutions for "async local storage" have sprung up to wrap IndexedDB. Perhaps the most well-known of these is [localForage](https://localforage.github.io/localForage/), which copies the `localStorage` API directly.

Browser vendors have never been able to justify the resources on specifying and shipping their own async local storage solution, given that IndexedDB exists as as the more powerful lower-level building block. This makes the platform unergonomic, out-of-the-box, for this simple use case. Fortunately, this sort of case is exactly what [permafills](https://github.com/drufball/permafills) are designed to solve!

## API Surface

The simplest API surface would be as follows. Note that keys and values would be allowed to be any [structured-serializable type](https://html.spec.whatwg.org/multipage/structured-data.html#serializable-objects).

### `set(key, value)`

Sets the value of the entry identified by `key` to `value`. Returns a promise that fulfills with `undefined` once this is complete.

### `get(key)`

Returns a promise for the value of the entry identified by `key`, or `undefined` if no value is present.

### `has(key)`

Returns a promise for a boolean that indicates whether an entry identified by `key` exists.

### `delete(key)`

Removes the entry identified by `key`, if it exists. Once this completes, returns a promise for a boolean that indicates whether or not something existed there (and was thus deleted).

### `clear()`

Clears all entries. Returns a promise for `undefined`.

### `keys()`

Returns a promise for an array containing all the stored keys.

### `values()`

Returns a promise for an array containing all the stored values.

### `entries()`

Returns a promise for an array containing all the stored key/value pairs, each as a two-element array.

### Variations and choices

- We could have keys/values/entries return [async iterators](https://github.com/tc39/proposal-async-iteration). This would work better in situations with potentially many entries.
- We could eliminate the difference between an entry with value `undefined` and a missing entry. This would eliminate `has()`, and make `delete()` sugar for `set(x, undefined)`. This might be a good idea since `has()` is somewhat of a footgun in async scenarios, as it encourages race-condition-prone code via a combination of `has()` + `get()` instead of just using `get()` directly.
- We could have `set()` return a promise for the set value, to increase the similarity with JavaScript `Map`s.

### Separate storage areas

With the above API there is no simple way to create an "isolated" storage area for your own use. We could expand the API so that there's still a simple, default storage area, but you can also create your own. Here's one idea:

```js
import { storage, StorageArea } from "browser:async-local-storage|https://somecdn.com/async-local-storage.js";

(async () => {
  await storage.set("mycat", "Tom");
  console.assert(await storage.get("mycat") === "Tom");

  const otherStorage = new StorageArea("unique string");
  console.assert((await otherStorage.keys()).length === 0);
  await otherStorage.set("mycat", "Jerry");
  console.assert(await otherStorage.get("mycat") === "Jerry");
})();
```

Note that the scope of the default storage area would be per-realm, or more precisely, per module map, since it would be created whenever you imported the module.

## Impact

This feature would be low-effort, medium-reward.

- Developers would be steered away from the perils of `localStorage`, toward this modern, attractive alternative.
- Applications would no longer need to ship complex IndexedDB logic, or the 9.5 KB localForage library.

localForage is downloaded [~350K times per month](https://www.npmjs.com/package/localforage) via npm. For comparison, Angular is downloaded [~960K times per month](https://www.npmjs.com/package/angular), React [~5.896 million times per month](https://www.npmjs.com/package/react), and Vue [~1.030 million](https://www.npmjs.com/package/vue).
