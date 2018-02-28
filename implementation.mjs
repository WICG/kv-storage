// This is not spec-compliant in that it is susceptible to tampering with the built-in prototypes and
// globals. Otherwise, though, it should be equivalent to the spec.

export class StorageArea {
  #databaseName = null;
  #databasePromise = null;

  constructor(name) {
    this.#databaseName = "async-local-storage" + `${name}`;
  }

  async set(key, value) {
    throwForDisallowedKey(key);

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
    throwForDisallowedKey(key);

    const database = await this.#prepareToPerformDatabaseOperation();

    const transaction = database.transaction("store", "readonly");
    const store = transaction.objectStore("store");

    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async has(key) {
    throwForDisallowedKey(key);

    const database = await this.#prepareToPerformDatabaseOperation();

    const transaction = database.transaction("store", "readonly");
    const store = transaction.objectStore("store");

    const request = store.count(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result === 0 ? false : true);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(key) {
    throwForDisallowedKey(key);

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

function isAllowedAsAKey(value) {
  if (typeof value === "number" || typeof value === "string") {
    return true;
  }

  if (Array.isArray(value)) {
    return true;
  }

  if (isDate(value)) {
    return true;
  }

  if (ArrayBuffer.isView(value)) {
    return true;
  }

  if (isArrayBuffer(value)) {
    return true;
  }

  return false;
}

function isDate(value) {
  try {
    Date.prototype.getTime.call(value);
    return true;
  } catch {
    return false;
  }
}

const byteLengthGetter = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength").get;
function isArrayBuffer(value) {
  try {
    byteLengthGetter.call(value);
    return true;
  } catch {
    return false;
  }
}

function throwForDisallowedKey(key) {
  if (!isAllowedAsAKey(key)) {
    throw new DOMException("The given value is not allowed as a key", "DataError");
  }
}
