# Contributing to Pinvelto

Pinvelto is an independently maintained, internal-use visual Feedback product.
Report bugs, propose changes, and submit project contributions to
[luxi78/vibe-annotations](https://github.com/luxi78/vibe-annotations).
Follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Report and implement changes

Check existing project issues first. Describe the observed and expected behavior,
reproduction steps, environment, and useful screenshots. For proposals, explain
the problem and intended result before implementation.

Create an `issue/<number>` branch from the current project integration branch or
`main`, as directed by the issue. Use test-driven slices at the agreed public
boundaries and run relevant regression tests. Document acceptance evidence and
remaining gaps. Project pull requests, when used, target this repository.

## Development

This is a pnpm workspace: run `pnpm install` at the root to install dependencies.
The extension uses WXT; run `pnpm dev` in `packages/extension`, then load
`packages/extension/.output/chrome-mv3` through Chrome's **Load unpacked** action
with Developer mode enabled. The local MCP service is in `packages/server` and
the internal documentation website is in `packages/website`.

Use [the installation guidance](README.md) for local service setup and commands.
Use package-specific `CLAUDE.md` files where present for architecture details.
All packages are intended for internal installation from repository artifacts;
public npm and browser-store publication are outside this project's scope.

Use 2 spaces for indentation, meaningful names, and the surrounding code style.
Write engineering documentation and commits in English. Use imperative commit
subjects of at most 72 characters and reference the originating issue. Include
`Closes #<number>` or `Fixes #<number>` when resolving a verified issue, following
[the tracker workflow](docs/agents/issue-tracker.md).

## Upstream relationship

Run `node scripts/setup-upstream-guard.mjs` after setting up the upstream read
remote in each clone. Follow [upstream maintenance](docs/upstream-maintenance.md)
for setup, local-only verification, and the required adoption assessment.
Upstream is a read source. Do not submit Pinvelto work there, automatically merge
upstream, or adopt changes before the maintainer confirms the assessment.

The repository rename and local-directory relocation are deferred to separate
operations after implementation acceptance.

## Licensing and attribution

Pinvelto derives from Vibe Annotations. Preserve the inherited
[PolyForm Shield License 1.0.0](LICENSE), [NOTICE](NOTICE), source attribution,
and Git history. Contributions use the applicable project license terms.
Internal use and a new brand do not establish legal clearance or relicense
inherited code. Assess license and notice changes before any upstream adoption.
