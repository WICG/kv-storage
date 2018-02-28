// This is not spec-compliant in that it is susceptible to tampering with the built-in prototypes and
// globals. Otherwise, though, it should be equivalent to the spec.

export class StorageArea {
  #name = null;
  #dbPromise = null;

  constructor(name) {
    this.#name = `${name}`;
  }

  set(key, value) {}
  get(key) {
    return this.#performDatabaseOperation(database => {
      const transaction = database.transaction("store", "readonly");
      const store = transaction.objectStore("store");

      const request = store.get(key);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  }
  has(key) {}
  delete(key) {}
  clear() {}

  keys() {}
  values() {}
  entries() {}

  get backingStore() {}

  #performDatabaseOperation(steps) {
    // TypeError is automatic via the immediate usage of this.#dbPromise.

    if (this.#dbPromise === null) {
      this.#dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open("async-local-storage:" + this.#name, 1);

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

    return this.#dbPromise.then(steps);
  }
}

export const storage = new StorageArea("default");
