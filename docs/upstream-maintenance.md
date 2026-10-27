# Independent maintenance and upstream assessment

Pinvelto is maintained in [luxi78/vibe-annotations](https://github.com/luxi78/vibe-annotations).
Use that repository for project issues and contributions. Retain
[RaphaelRegnier/vibe-annotations](https://github.com/RaphaelRegnier/vibe-annotations)
as a read source, without submitting Pinvelto changes as upstream pull requests.

## Protect each clone

Run these commands from the repository root after cloning. Node.js and Git must
be available. If `upstream` already exists, inspect `git remote -v` instead of
adding it again.

```sh
git remote add upstream https://github.com/RaphaelRegnier/vibe-annotations.git
node scripts/setup-upstream-guard.mjs
git fetch upstream
```

The setup is repeatable. It installs a repository-local `core.hooksPath` pointing
at the tracked `.githooks` directory and replaces upstream's push URL with a
nonexistent local path inside Git's common directory. Fetch URLs remain intact.
The pre-push hook rejects the `upstream` remote, destinations matching its fetch
URL, and the canonical upstream repository's HTTPS/SSH/Git URLs, including when
used through another remote name. Project-origin operations remain available.
No global Git settings are modified. Linked worktrees share local Git
configuration and use the tracked hook in each checkout; keep it present in the
branches used for project work.

If an existing custom hook directory or pre-push hook is detected, setup stops
before changing configuration. Integrate the tracked pre-push check into that
hook yourself, preserving the existing checks, then install the disabled upstream
push URL deliberately. Do not silently replace another project's hook policy.

Inspect the effective setup with:

```sh
git config --local --get core.hooksPath
git remote -v
node --test tests/upstream-guard.test.mjs
```

Tests use disposable local repositories only. They exercise real `git fetch`,
`git push`, remote-reference inspection, and Git hook invocation. Canonical
upstream URLs are passed directly to `git hook run`, never to a network push.
The guard is an accidental-push safeguard, not an access-control boundary:
Git permits deliberate hook bypasses, configuration changes, and alternative URL
spellings. Keep repository permissions appropriate and inspect destinations.

## Assess each proposed adoption

Fetch upstream for inspection; do not automatically merge it. Create a project
issue or review document with the following assessment before applying code:

| Field | Required evidence |
| --- | --- |
| Source | Upstream repository URL and exact source commit SHA(s), with links |
| Problem | The concrete Pinvelto problem the change solves |
| Product fit | Why it fits Pinvelto's independent direction and internal-use scope |
| License and provenance | License/notice changes in the selected commits and files; preserve required notices and attribution |
| Existing behavior and data | Effects on Feedback, attachments, exports, Variants, storage, configuration, and runtime identity; identify any incompatibilities |
| Approach | Selected commit(s) or independent adaptation, and why; avoid bulk synchronization as the default |
| Verification | Proposed public-boundary regression checks, test results, visual evidence, and unresolved gaps |
| Maintainer decision | Explicit confirmation of this assessment, with a link and date, before adoption |
| Delivery trace | Implementation commit(s), source-commit references, validation results, and deviations from the approved assessment |

Wait for the maintainer's confirmation of the assessment before cherry-picking
or adapting proposed code. Approval of another change or this maintenance
workflow does not approve a future adoption. Preserve source references in the
delivery commit or associated issue. No upstream adoption is needed to validate
this workflow, and no automatic synchronization or upstream PR process is added.

## Provenance and later repository operations

Retain inherited Git history, [LICENSE](../LICENSE), [NOTICE](../NOTICE), and
applicable source attribution. Rebranding and internal use do not relicense
inherited code or establish legal clearance. Review proposed license changes
as part of the specific adoption assessment.

The inherited `TERMS.md` contains an older MIT claim that conflicts with the
current PolyForm Shield `LICENSE` and package metadata. Treat that text as
inherited provenance, not a grant of a new Pinvelto license. Refer readers to
`LICENSE` and `NOTICE`; do not repeat the MIT claim in current product guidance.
This records the inconsistency and does not claim legal clearance.

Rename the remote repository to `pinvelto` and relocate the local directory only
as separate maintainer operations after implementation acceptance. Neither is an
installation prerequisite or part of this implementation. After a later
rename, update origin and project-owned links, rerun the safeguard, and verify
fetch and project-origin operations; retain the upstream read source.
