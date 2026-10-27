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
| #25 — extension-to-MCP Feedback | Pending | Pending |
| #26 — exports and Variants | Pending | Pending |
| #27 — production brand assets | [Brand evidence](../design/brand/README.md) | 198 unit tests, brand and entry E2E checks, website typecheck/build; independent inspection of native-size, extension, and documentation captures |
| #28 — internal delivery and documentation | Pending | Pending |
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

Implementation is in progress. The pending slices above must be completed and
reviewed before specification #23 can be closed.
