// This is not spec-compliant in that it is susceptible to tampering with the built-in prototypes and
// globals. Otherwise, though, it should be equivalent to the spec.

export class StorageArea {
  #databaseName = null;
  #databasePromise = null;

  constructor(name) {
    this.#databaseName = "async-local-storage" + `${name}`;
  }

  async set(key, value) {
    throwForKeyRanges(key);

    const database = await this.#prepareToPerformDatabaseOperation();

    const transaction = database.transaction("store", "readwrite");
    const store = transaction.objectStore("store");

    store.put(value, key);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async get(key) {
    throwForKeyRanges(key);

    const database = await this.#prepareToPerformDatabaseOperation();

    const transaction = database.transaction("store", "readonly");
    const store = transaction.objectStore("store");

    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  has(key) {}

  async delete(key) {
    throwForKeyRanges(key);

    const database = await this.#prepareToPerformDatabaseOperation();

    const transaction = database.transaction("store", "readwrite");
    const store = transaction.objectStore("store");

    store.delete(key);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  clear() {}

  keys() {}
  values() {}
  entries() {}

  get backingStore() {
    return {
      database: this.#databaseName,
      store: "store",
      version: 1
    };
  }

  #prepareToPerformDatabaseOperation() {
    // TypeError is automatic via the immediate usage of this.#databasePromise.

    if (this.#databasePromise === null) {
      this.#databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(this.#databaseName, 1);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);

        request.onupgradeneeded = () => {
          try {
            request.result.createObjectStore("store");
          } catch (e) {
            reject(e);
          }
        };
      });
    }

    return this.#databasePromise;
  }
}

export const storage = new StorageArea("default");

function throwForKeyRanges(key) {
  try {
    // This will throw when applied to non-key ranges.
    IDBKeyRange.prototype.includes.call(key, 0);
  } catch {
    return;
  }

  // If we got here, .includes() did not throw when applied to key, so key is a key range.
  throw new TypeError("Key ranges are not supported as keys in async-local-storage");
}
