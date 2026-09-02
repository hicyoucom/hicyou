# Contributing to HiCyou

Thank you for contributing. Keep changes focused, include tests where behavior changes, and run the repository checks before opening a pull request.

```bash
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun test
bun run build
```

Do not submit secrets, production data, personal information, customer or partner material, private incident reports, or content you do not have the right to license.

## Developer Certificate of Origin

Every commit must include a `Signed-off-by` line certifying the [Developer Certificate of Origin 1.1](https://developercertificate.org/):

```bash
git commit -s
```

Unless explicitly stated otherwise, contributions intentionally submitted to this project are provided under Apache-2.0, in accordance with section 5 of that license. The sign-off does not transfer copyright.
