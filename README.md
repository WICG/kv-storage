# Async Local Storage

This document is an explainer for a potential future web platform feature, "async local storage". It's like [`localStorage`](https://html.spec.whatwg.org/multipage/webstorage.html#webstorage), but async!

This feature would be implemented as a [layered API](https://github.com/drufball/layered-apis) on top of IndexedDB; see more on that below.

A [full specification](https://domenic.github.io/async-local-storage/) is also available.

## Sample code

```js
import { storage } from "std:async-local-storage|https://cdn.example/async-local-storage.mjs";

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

The alternative is IndexedDB. IndexedDB is, however, quite hard to use. It has no simple key/value layer, instead requiring understanding concepts like database upgrades and transactions. Its API is also quite dated; it does not use promises, but instead `IDBRequest` objects with their `onsuccess` and `onerror` methods.

In the face of this, a cottage industry of solutions for "async local storage" have sprung up to wrap IndexedDB. Perhaps the most well-known of these is [localForage](https://localforage.github.io/localForage/), which copies the `localStorage` API directly.

Browser vendors have never been able to justify the resources on specifying and shipping their own async local storage solution, given that IndexedDB exists as as the more powerful lower-level building block. This makes the platform unergonomic, out-of-the-box, for this simple use case. It's a travesty that those trying to develop on the web platform have no simple, usable solution for storing key/value data.

Fortunately, this sort of case is exactly what [layered APIs](https://github.com/drufball/layered-apis) are designed to solve!

## API

### `Map`-like key/value pair API

Note that keys and values would be allowed to be any [structured-serializable type](https://html.spec.whatwg.org/multipage/structured-data.html#serializable-objects) (see [#2](https://github.com/domenic/async-local-storage/issues/2) for more discussion).

#### `set(key, value)`

Sets the value of the entry identified by `key` to `value`. Returns a promise that fulfills with `undefined` once this is complete.

#### `get(key)`

Returns a promise for the value of the entry identified by `key`, or `undefined` if no value is present.

#### `has(key)`

Returns a promise for a boolean that indicates whether an entry identified by `key` exists.

#### `delete(key)`

Removes the entry identified by `key`, if it exists. Once this completes, returns a promise for undefined.

#### `clear()`

Clears all entries. Returns a promise for `undefined`.

#### `keys()`

Returns a promise for an array containing all the stored keys.

#### `values()`

Returns a promise for an array containing all the stored values.

#### `entries()`

Returns a promise for an array containing all the stored key/value pairs, each as a two-element array.

### `new StorageArea()`: separate storage areas

We additionally expose a `StorageArea` constructor, which allows you to create an "isolated" storage area that is less likely to collide than using the default one:

```js
import { storage, StorageArea } from "std:async-local-storage|https://cdn.example/async-local-storage.mjs";

(async () => {
  await storage.set("mycat", "Tom");
  console.assert(await storage.get("mycat") === "Tom");

  const otherStorage = new StorageArea("unique string");
  console.assert((await otherStorage.keys()).length === 0);
  await otherStorage.set("mycat", "Jerry");
  console.assert(await otherStorage.get("mycat") === "Jerry");
})();
```

This sort of API has [precedent in localForage](https://www.npmjs.com/package/localforage#multiple-instances), which is notable since localForage otherwise sticks rather strictly to the `localStorage` API surface.

The scope of the default storage area would be per-realm. (Or more precisely, per module map, since it would be created whenever you imported the module.)

### `backingStore`: falling back to IndexedDB

One of the great things about implementing async local storage as a layered web API on top of IndexedDB is that, if the developer's code grows beyond the capabilities of a simple key/value store, they can easily transition to the full power of IndexedDB (such as using transactions, indices, or cursors), while reusing their database.

To facilitate this, we include an API that allows you to get a `{ database, store, version }` object identifying the IndexedDB database and store within that database where a given `StorageArea`'s data is being stored:

```js
import { storage } from "std:async-local-storage|https://cdn.example/async-local-storage.mjs";
import { open as idbOpen } from "https://www.npmjs.com/package/idb/pretend-this-was-a-native-JS-module";

(async () => {
  await storage.set("mycat", "Tom");
  await storage.set("mydog", "Joey");

  const { database, store, version } = storage.backingStore;
  const db = await idbOpen(database, version);
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).add("mycat", "Jerry");
  tx.objectStore(store).add("mydog", "Kelby");
  await tx.complete;
  await db.close();
})();
```

### Open issues and questions

Please see [the issue tracker](https://github.com/domenic/async-local-storage/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc+label%3Aapi) for open issues on the API surface detailed above.

## Impact

This feature would be low-effort, medium-reward.

- Developers would be steered away from the perils of `localStorage`, toward this modern, attractive alternative.
- Applications would no longer need to ship complex IndexedDB logic, or the 9.5 KB localForage library.

localForage is downloaded [~350K times per month](https://www.npmjs.com/package/localforage) via npm.

Another notable library in this vein is [idb-keyval](https://www.npmjs.com/package/idb-keyval), which is downloaded ~16K times per month via npm.

For comparison, Angular is downloaded [~960K times per month](https://www.npmjs.com/package/angular), React [~5.896 million times per month](https://www.npmjs.com/package/react), and Vue [~1.030 million](https://www.npmjs.com/package/vue).

## Appendix: layered API vs. traditional browser API

As mentioned briefly above, we see the async local storage specification as the perfect candidate for using the [layered API](https://github.com/drufball/layered-apis) infrastructure.

You can read more about layered APIs in general, and the motivations behind them, at that link. But one perspective that may be helpful is to consider the ways in which async local storage would be different if it were implemented as a more traditional browser API, versus a layered API. The following list is, to our knowledge, comprehensive:

* As a layered API, you need to import the `storage` and `StorageArea` values from the "`std:async-local-storage`" built-in module. A traditional browser API would expose these as globals.

  This choice allows implementations to lazily load the code for async local storage only as requested by the page, instead of having to generate the bindings for the `storage` and `StorageArea` globals in every realm (whether or not they are used).
* As a layered API, async local storage has explicit interactions with the underlying platform feature it is based on, viz. IndexedDB. A traditional browser API that supplied async local storage functionality would probably instead choose to use an independent storage mechanism, not directly accessible to web developers except through the async local storage API itself. (Similar to how `localStorage`, IndexedDB, and the cache API are all independent, and not layered on top of any single primitive.)

  We believe this layering provides benefits, both in the abstract sense of the [extensible web manifesto](http://extensiblewebmanifesto.org/), but also in the concrete sense of [allowing the web developer access to the backing store](https://domenic.github.io/async-local-storage/#example-backingstore).
* As a layered API, we've made certain choices about esoteric aspects of how classes and methods are exposed that differ slightly from Web IDL-defined classes. None of these differences are essential, and we could eliminate them if desired. See [the explanation in the specification](https://domenic.github.io/async-local-storage/#class-definition-explanation) for more on this subject.

As you can see, the observable differences between layered API vs. traditional browser APIs are fairly slight. The most noticeable for web developers is probably the use of a built-in module instead of global properties.
