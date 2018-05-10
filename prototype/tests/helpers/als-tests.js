import { StorageArea } from "../../implementation.mjs";

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
