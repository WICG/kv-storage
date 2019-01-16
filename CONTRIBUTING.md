# Contribution Details

## Joining WICG

This repository is being used for work in the W3C [Web Platform Incubator Community Group](https://www.w3.org/community/wicg/) (WICG), governed by the [W3C Community License Agreement (CLA)](http://www.w3.org/community/about/agreements/cla/). To make substantive contributions, you must join the Community Group, thus signing the CLA.

## Editing the specification

Edits to the specification are done in the `spec.bs` file, which is then compiled with the [Bikeshed](https://tabatkins.github.io/bikeshed/) spec pre-processor.

To build the specification, you can use one of:

- `make local`: uses a locally-installed copy of Bikeshed
- `make remote`: uses a Bikeshed web service, so you don't have to install anything locally

## Tests

Tests are maintained as part of the [web platform tests](https://github.com/web-platform-tests/wpt) project, under the [`kv-storage`](https://github.com/web-platform-tests/wpt/tree/master/kv-storage) directory.

This specification uses a tests-required policy: all normative changes must be accompanied by corresponding changes to the test suite.

## For maintainers: identifying contributors to a pull request

If the author is not the sole contributor to a pull request, please identify all contributors in the pull request comment.

To add a contributor (other than the author, which is automatic), mark them one per line as follows:

```
+@github_username
```

If you added a contributor by mistake, you can remove them in a comment with:

```
-@github_username
```

If the author is  making a pull request on behalf of someone else but they had no part in designing the feature, you can remove them with the above syntax.
