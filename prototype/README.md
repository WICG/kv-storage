# Async local storage prototype implementation

This folder includes a prototype implementation of the specification, as well as tests for it.

The tests aren't quite ready to be upstreamed into [web platform tests](https://github.com/w3c/web-platform-tests/). For that, we'd need to import the built-in layered web API instead of importing `implementation.mjs`, and we'd need to use the appropriate paths for `testharness.js` etc. But they'll definitely serve as the basis for the eventual tests.

## Test plan

Tests that we should write:

- clear()
- entries()/keys()/values()
  - Don't forget to test undefined values
- Interaction with IndexedDB, including edge cases where we mess with the backing store
  - clear() will especially be interesting
