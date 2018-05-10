import { StorageArea, storage as defaultArea } from "../../implementation.mjs";
import { assertArrayCustomEquals } from "./equality-asserters.js";

export function testWithArea(testFn, description) {
  test(t => {
    const area = new StorageArea(description);
    t.add_cleanup(t => area.clear());

    testFn(area, t);
  }, description);
}

export function promiseTestWithArea(testFn, description) {
  promise_test(t => {
    const area = new StorageArea(description);
    t.add_cleanup(t => area.clear());

    return testFn(area, t);
  }, description);
}

export function promiseTestWithDefaultArea(testFn, description) {
  promise_test(t => {
    t.add_cleanup(t => defaultArea.clear());

    return testFn(defaultArea, t);
  }, description);
}

export function testVariousMethodsWithDefaultArea(label, key, value, equalityAsserter) {
  promiseTestWithDefaultArea(testVariousMethodsInner(key, value, equalityAsserter), label);
}

export function testVariousMethods(label, key, value, equalityAsserter) {
  promiseTestWithArea(testVariousMethodsInner(key, value, equalityAsserter), label);
}

function testVariousMethodsInner(key, value, equalityAsserter) {
  return async (area, t) => {
    assert_equals(await area.set(key, value), undefined,
      "set() must return a promise for undefined");

    assert_equals(await area.get(key), value, "get() must give back the set value");
    assert_equals(await area.has(key), true, "has() must return true for the set key");
    assertArrayCustomEquals(await area.keys(), [key], equalityAsserter, "keys() must have the key");
    assert_array_equals(await area.values(), [value], "values() must have the value");

    const entries = await area.entries();
    assert_true(Array.isArray(entries), "entries() must give an array");
    assert_equals(entries.length, 1, "entries() must have only one value");
    assert_true(Array.isArray(entries[0]), "entries() 0th element must be an array");
    assert_equals(entries[0].length, 2, "entries() 0th element must have 2 elements");
    equalityAsserter(entries[0][0], key, "entries() 0th element's 0th element must be the key");
    assert_equals(entries[0][1], value, "entries() 0th element's 1st element must be the value");

    assert_equals(await area.delete(key), undefined,
      "delete() must return a promise for undefined");

    assert_equals(await area.get(key), undefined,
      "get() must give back undefined after deleting");
    assert_equals(await area.has(key), false,
      "has() must give back false after deleting");
  }
}
