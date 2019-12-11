# KV Storage

This document is an explainer for a potential future web platform feature, "KV storage" (short for "key/value storage"). It's similar to [`localStorage`](https://html.spec.whatwg.org/multipage/webstorage.html#webstorage) in utility, but much more modern, and layered on top of IndexedDB.

_This feature was formerly known as "async local storage", but in [#38](https://github.com/WICG/kv-storage/issues/38), folks pointed out that since we don't intend to access the `localStorage` database itself, that name was misleading._

This feature would use IndexedDB as its backing store; see more on that below.

A [full specification](https://domenic.github.io/kv-storage/) is also available.

At [TPAC 2018](https://www.w3.org/2018/10/TPAC/Overview.html), the Web Platform Working Group and the [IndexedDB](https://w3c.github.io/IndexedDB/) specification editors [agreed](https://www.w3.org/2018/10/22-WebPlat-minutes.html#item05) that after incubation in the WICG, KV storage should graduate to be part of the W3C IndexedDB specification.

KV Storage ran as an [origin trial](https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md) from Chrome 74−76; the [origin trial feedback report](./Origin%20Trial%20Feedback.md) is now available.

Previous revisions of this specification and explainer positioned KV storage as a built-in module. Due to a [variety of concerns](https://github.com/w3ctag/design-reviews/issues/421#issuecomment-561705979) we have moved away from that approach, toward using traditional globals.

## Status

Work on this specification is currently suspended, as no browser teams (including the Chromium project, which originated the proposal) are currently indicating interest in implementing it.

## Sample code

```js
(async () => {
  await kvStorage.set("mycat", "Tom");
  console.assert(await kvStorage.get("mycat") === "Tom");

  for await (const [key, value] of kvStorage.entries()) {
    console.log(key, value);
  }
  // Logs "mycat", "Tom"

  await kvStorage.delete("mycat");
  console.assert(await kvStorage.get("mycat") === undefined);
})();
```

## Motivation

Local storage is a well-known and well-loved API. It only has one problem: it's synchronous. This leads to [terrible performance](https://hacks.mozilla.org/2012/03/there-is-no-simple-solution-for-local-storage/) and cross-window synchronization issues.

The alternative is IndexedDB. IndexedDB is, however, quite hard to use. It has no simple key/value layer, instead requiring understanding concepts like database upgrades and transactions. Its API is also quite dated; it does not use promises, but instead `IDBRequest` objects with their `onsuccess` and `onerror` methods.

In the face of this, a cottage industry of solutions for "async key/value storage" have sprung up to wrap IndexedDB. Perhaps the most well-known of these is [localForage](https://localforage.github.io/localForage/), which copies the `localStorage` API directly.

After many years of convergence in library-space on this sort of solution, it's time to bring a simple async key/value storage solution out of the cold and into the web platform.

## API

### `kvStorage` global

The default storage area is accessible via the `self.kvStorage` global, accessible in both windows and workers. It has the following API:

### `Map`-like key/value pair API

Note that keys and values would be allowed to be any [structured-serializable type](https://html.spec.whatwg.org/multipage/structured-data.html#serializable-objects) (see [#2](https://github.com/WICG/kv-storage/issues/2) for more discussion).

#### `set(key, value)`

Sets the value of the entry identified by `key` to `value`. Returns a promise that fulfills with `undefined` once this is complete.

_Note: setting an entry to have the value `undefined` is equivalent to deleting it. See discussion in [#3](https://github.com/WICG/kv-storage/issues/3)._

#### `get(key)`

Returns a promise for the value of the entry identified by `key`, or `undefined` if no value is present.

#### `delete(key)`

Removes the entry identified by `key`, if it exists. Once this completes, returns a promise for undefined.

_Note: this is equivalent to `set(key, undefined)`. See discussion in [#3](https://github.com/WICG/kv-storage/issues/3)._

#### `clear()`

Clears all entries. Returns a promise for `undefined`.

#### `keys()`

Returns an async iterator for all the stored keys, sorted in the underlying IndexedDB key order.

#### `values()`

Returns an async iterator for all the stored values, sorted to correspond with `keys()`.

#### `entries()`

Returns an async iterator of `[key, value]` pairs, sorted to correspond with `keys()`.

### `new KVStorageArea()`: separate storage areas

We additionally expose a `KVStorageArea` constructor, which allows you to create an "isolated" storage area that is less likely to collide than using the default one:

```js
(async () => {
  await kvStorage.set("mycat", "Tom");
  console.assert(await kvStorage.get("mycat") === "Tom");

  const otherStorage = new KVStorageArea("unique string");
  console.assert(await otherStorage.get("mycat") === undefined);
  await otherStorage.set("mycat", "Jerry");
  console.assert(await otherStorage.get("mycat") === "Jerry");
})();
```

This sort of API has [precedent in localForage](https://www.npmjs.com/package/localforage#multiple-instances), which is notable since localForage otherwise sticks rather strictly to the `localStorage` API surface.

The scope of the default storage area would be per-realm. (Or more precisely, per module map, since it would be created whenever you imported the module.)

### `backingStore`: falling back to IndexedDB

One of the great things about layering KV storage on top of IndexedDB is that, if the developer's code grows beyond the capabilities of a simple key/value store, they can easily transition to the full power of IndexedDB (such as using transactions, indices, or cursors), while reusing their database.

To facilitate this, we include an API that allows you to get a `{ database, store, version }` object identifying the IndexedDB database and store within that database where a given `KVStorageArea`'s data is being stored:

```js
import { openDB } from "https://unpkg.com/idb?module"; // https://www.npmjs.com/package/idb

(async () => {
  await kvStorage.set("mycat", "Tom");
  await kvStorage.set("mydog", "Joey");

  const { database, store, version } = kvStorage.backingStore;
  const db = await openDB(database, version);
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).add("mycat", "Jerry");
  tx.objectStore(store).add("mydog", "Kelby");
  await tx.complete;
  await db.close();
})();
```

## Impact

- Developers would be steered away from the perils of `localStorage`, toward this modern, attractive alternative.
- Applications would no longer need to ship complex IndexedDB logic, or the 9.5 KB localForage library.

localForage is downloaded [~227K times per week](https://www.npmjs.com/package/localforage) via npm.

Another notable library in this vein is [idb-keyval](https://www.npmjs.com/package/idb-keyval), which is downloaded ~119K times per week via npm.

For comparison, Angular is downloaded [~2.314 million times per week](https://www.npmjs.com/package/@angular/core), React [~6.312 million times per week](https://www.npmjs.com/package/react), and Vue [~995K times per week](https://www.npmjs.com/package/vue).

(All of the above statistics are as of 2019-03-14.)
