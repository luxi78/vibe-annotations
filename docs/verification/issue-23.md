# Pinvelto independence acceptance

Specification: [#23](https://github.com/luxi78/vibe-annotations/issues/23).
Integration branch: `issue/23`. Starting point: `b239e01`.

## Delivery graph

`#24 → #25 → #26 → #28`, with `#27 → #28`; `#29` is independent.
The approved specification, scope, ADR, glossary changes, and selected concept
reference are committed in `dde2810`. Repository renaming and directory
relocation remain separate operations after acceptance.

## Evidence index

| Slice | Evidence | Integration verification |
| --- | --- | --- |
| #24 — isolated CLI, service, MCP | [Service verification](issue-24.md) | 18 server tests passed; real processes, HTTP, MCP, temporary homes/ports/configurations; offline temporary-prefix installation |
| #25 — extension-to-MCP Feedback | [Browser verification](issue-25.md) | 200 unit tests and 69 browser tests passed; actual screenshot, persisted Feedback, complete MCP identity/tool list, visible MCP update, preserved old state and foreign-service isolation |
| #26 — exports and Variants | [Export and lifecycle verification](issue-26.md) | 200 extension and 18 server tests, 19 relevant browser checks, final four acceptance rerun; real generated-project finalization/restoration and code-preserving global purge; own exports and missing references |
| #27 — production brand assets | [Brand evidence](../design/brand/README.md) | 198 unit tests, brand and entry E2E checks, website typecheck/build; independent inspection of native-size, extension, and documentation captures |
| #28 — internal delivery and documentation | [Delivery verification](issue-28.md), [independent installation/update](issue-28-install-update.md) | Distinct reviewed-revision update preserves Feedback/images/configuration; fresh and delayed startup pass; docs/help visual and network checks; four private packages reject offline publish dry runs |
| #29 — independent maintenance | [Guard verification](issue-29.md) | Four real Git boundary tests passed; clone-local guard activated; upstream fetch retained |

## Acceptance boundaries

The specification already confirms browser-to-service-to-MCP, public CLI/HTTP
isolation, exports/Variants, and delivery/visual verification as the test seams.
Passing internal tests or closing a ticket does not establish the other seams.
Browser acceptance must exercise a fresh profile and an isolated actual service,
including usable visual context and visible results of MCP updates.

All process/configuration acceptance checks use temporary directories and ports.
No existing upstream installation, agent entry, data, or generated project code
is migrated or removed. LICENSE, NOTICE, and inherited history are preserved.
The inherited TERMS inconsistency is documented in the
[maintenance policy](../upstream-maintenance.md).

## Workspace environment

The initial dependency directories contained inaccessible links. They were
preserved in ignored `.local/dependencies-before-pinvelto` and dependencies were
installed from the frozen lockfile. Extension build and real Chromium baseline
checks then passed. This repair is local environment maintenance, not a product
data migration.

## Final acceptance

Final integration checks on 2026-10-27, after merging all six tickets into
`issue/23` at `36e86b1`:

- Frozen-lockfile installation passed in the integration checkout.
- Production extension build passed; the loadable output is
  `packages/extension/.output/chrome-mv3`, separate from isolated E2E output.
- Extension unit tests: **200 passed, zero failures**.
- Server tests: **19 passed**, including a real child delayed 5.5 seconds.
- Disposable Git boundary tests: **4 passed**.
- Complete browser suite: **75 passed, zero failures/skips**, in 3.2 minutes.
  It includes the actual browser/service/MCP workflow, exports, generated-project
  Variants lifecycle, review/deletion, keyboard/focus/frames, and rendered
  production documentation/help.
- Documentation production build generated **24 static routes**; TypeScript
  checks and `git diff --check` passed.
- Independent code-review axes compared `b239e01...36e86b1`: **Standards: zero
  actionable findings; Spec: zero actionable findings**. No review fixes remain.
- The integration coordinator independently inspected final native-size brand,
  extension/MCP, Variants, exported HTML, missing-reference, documentation desktop,
  installation, mobile, and built-in-help captures.

The independent clean-clone procedure exercised actual distinct revisions
`45d7dc8 → 1ace11a`, with isolated installation prefix, homes, ports, and profiles.
Feedback, exact image bytes, and existing configuration survived the update.
The original four-second startup budget failed a cold install; the bounded
20-second readiness fix was reproduced and independently checked with a real
5.5-second delayed server child. Process ownership and shutdown protections remain.

There is no known unfulfilled acceptance requirement. Runtime request logs are
scoped observations, not a packet capture of the normal dependency installation.
The production default endpoint was audited separately; browser acceptance uses
the controlled E2E artifact to avoid contacting an existing user service/profile.
No hosted deployment, repository rename, directory relocation, old-data migration,
or upstream code adoption was performed. Inherited license/provenance exceptions
and the original terms inconsistency remain explicitly documented.

## Worktree cleanup limitation

All six implementation worktree registrations were removed after confirming
clean tracked state and that their commits are ancestors of the pushed
integration branch. Their branches remain available as recovery references.
`issue-29` was physically removed. Git reported `Directory not empty` for
`issue-24` through `issue-28`, leaving partially removed directories under
`.worktrees/`. A subsequent scoped native PowerShell recursive removal was
rejected by automatic approval review with `blocked by policy`; it was not
executed or bypassed. Those five residual directories remain. This does not
affect the clean integration checkout, pushed commits, or product acceptance,
but physical cleanup of those remnants is unfinished.
