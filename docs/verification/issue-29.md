# Issue #29 verification

## Boundary and method

The approved delivery seam is exercised through Git's public CLI in disposable
temporary repositories. Tests do not push to, or otherwise write to, real upstream
or project-origin remotes. Git's global and system configuration is isolated in
the fixtures. Each fixture is removed after the test.

## TDD evidence

1. Added a fresh-clone setup/fetch/origin-push/upstream-denial test. Running
   `node --test tests/upstream-guard.test.mjs` failed because the setup script did
   not exist. Added setup with a disabled local upstream push destination. The
   test passed.
2. Added real alias/direct-destination push checks. The test failed because a
   push through the alias succeeded. Added the tracked pre-push hook and setup;
   both tests passed.
3. Extended verification to canonical HTTPS/SSH upstream addresses by invoking
   Git's hook directly (no network push), and to preserving preexisting hook
   settings on setup conflict.

Final command: `node --test tests/upstream-guard.test.mjs`.
Result: **4 passed, 0 failed**, on Windows with Node.js v24.13.1.

Observed results: upstream fetch succeeds; project-origin push creates its
expected remote branch; upstream named pushes fail; alias and direct upstream
pushes fail with the read-only diagnostic; upstream remote references remain
empty; setup is repeatable; setup conflicts preserve existing configuration.

## Scope and limitations

No upstream code was adopted, no repository was renamed, and no directory was
relocated. Inherited `LICENSE`, `NOTICE`, and Git history are unchanged. The
maintenance document records the inherited `TERMS.md` MIT inconsistency rather
than presenting it as current licensing guidance.

This protects against accidental pushes. It does not override Git's explicit
hook bypasses, permission settings, or a maintainer's deliberate reconfiguration.
The setup command must be run in each fresh clone. Existing custom hooks require
manual integration instead of silent replacement. Current integration-clone
activation is performed after merging these tracked files; testing never changes
the maintainer's Git configuration.
