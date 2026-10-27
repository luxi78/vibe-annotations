# Pinvelto independent identity

Agreed scope for establishing Pinvelto as an independent, internal-use product. The rationale and upstream relationship are recorded in [ADR-0001](adr/0001-independent-project-direction.md).

## Identity and terminology

- Product: **Pinvelto**. MCP configuration name, MCP server identity, and local CLI: `pinvelto`.
- Every exposed MCP tool uses the `pinvelto_` prefix and feedback-oriented names. Examples: `pinvelto_list_feedback`, `pinvelto_update_feedback`, `pinvelto_get_screenshot`. Exact tool signatures are implementation details and must preserve the current product capabilities.
- Use **Feedback** for user-facing and agent-facing records. Retain precise concepts such as pins, design previews, and Variants; use the glossary for their meaning.
- New package names, runtime identifiers, generated code markers, storage names, and page integration identifiers use the Pinvelto identity. Remove upstream tool aliases and brand-bearing runtime identifiers instead of maintaining compatibility layers.
- Replace the old product identity across software messages, agent instructions, generated exports, metadata, repository documentation, help, and installation guidance.
- Preserve source attribution and license notices. Historical Git records remain intact. Old names may occur in historical provenance and license material; they must not present upstream as Pinvelto's installation, support, update, or contribution destination.

## Fresh start and isolation

- Use independent runtime endpoints, product identity checks, storage, process files, and extension/page integration identifiers. Pinvelto must distinguish itself from an upstream service already running locally.
- Do not migrate old MCP configuration, feedback, attachments, extension settings, or generated Variants artifacts.
- Do not support legacy export imports, old tool names, or upstream-generated code markers. Pinvelto's own newly generated exports and Variants must work normally.
- Leave existing installations, agent configuration entries, and old data untouched. Their deletion or replacement is outside this implementation scope.

## Internal delivery and documentation

- Build and install from this repository: load the locally built browser extension and install/run the local server. Document a reproducible installation and update procedure.
- Remove automatic npm publishing and installation flows that download the upstream npm package or open its browser-store listing.
- Remove upstream version polling and upgrade prompts. Retain Pinvelto's local version information; internal updates are initiated deliberately.
- Convert the existing website into an internal documentation site with installation, usage, and troubleshooting guidance. Replace extension help links with links to project-owned documentation.
- Remove store promotion, upstream user-count claims, marketing material, and upstream contribution links. Do not invent a hosted documentation URL.
- Website deployment, domain purchase, public browser-store distribution, and public npm publication are outside scope.

## Repository and upstream policy

- Retain the full Git history and source provenance. The eventual repository and local directory name is `pinvelto`.
- Perform GitHub repository renaming and local-directory relocation as separate operations after implementation acceptance. Do not rename the active workspace as part of editing the code.
- Retain an upstream remote for reading and add safeguards against accidental upstream pushes. Project work is not submitted as upstream pull requests.
- Evaluate each proposed upstream adoption for the problem solved, alignment with Pinvelto, license changes, effects on existing features/data, and test evidence.
- Prefer specific commits or independent adaptations over bulk synchronization. Record source commits and obtain maintainer confirmation of the proposed adoption assessment before applying it. Do not automatically merge upstream changes.

## Visual identity

- Selected logo direction: **B, Feedback Window**, approved by the maintainer. Use the blue speech-window shape with a lower-left dialogue tail, an upper-right opening, and a detached square representing a selected feedback point. See the [selected concept board](design/pinvelto-logo-b-concept.png).
- The concept board is a visual reference, not a production icon. Preserve this geometry and blue direction when preparing final assets; verify the opening and detached square at actual small sizes.
- The logo must remain recognizable at 16 pixels and support monochrome, light-background, and dark-background use.
- Replace extension/documentation brand assets and necessary brand colors. Preserve the existing interface layout; a general UI redesign is outside scope.

## Acceptance

- A fresh internal installation presents Pinvelto consistently, exposes only the new MCP identity/tools, and requires no upstream npm package, store installation, or hosted documentation.
- The extension, service, and CLI operate together using isolated Pinvelto state and product identity checks. Starting or stopping Pinvelto does not manage an upstream process.
- Existing feedback creation, review, screenshots/attachments, MCP actions, exports, and Variants flows continue to work for new Pinvelto data.
- Old state is neither imported nor overwritten; no legacy migration or compatibility code is introduced.
- Product instructions and documentation direct people and agents to Pinvelto. Required attribution/license text and historical provenance remain available.
- Automatic public publishing and upstream update checks are absent. Local build/version/update instructions are usable.
- Validate affected packages with appropriate automated checks and inspect the actual extension/documentation UI, including the logo at small sizes. Document verification results and any remaining gaps.
