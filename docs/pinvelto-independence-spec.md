## Problem Statement

The maintainer considers several product-direction changes essential, but those changes have generally not been accepted upstream. The project therefore needs an independent identity and maintenance direction rather than continuing as a contribution-oriented fork of Vibe Annotations.

Today, documentation, installation instructions, browser assets, software messages, MCP identity, package metadata, update checks, and contribution links still represent the upstream product. Installation can direct users to upstream binaries, while shared runtime identifiers and storage can cause the two products to be mistaken for each other. Generic annotation terminology also makes it harder for coding agents to distinguish this product's feedback from their own annotation features.

## Solution

Establish **Pinvelto** as a consistently branded, independently maintained visual-feedback product for internal use. Users build and install it from this repository, create Feedback in the browser, and let coding agents act on that Feedback through a clearly named Pinvelto MCP service.

Pinvelto starts fresh with its own runtime identity and storage. It does not migrate or support old configuration, data, export formats, tool aliases, or upstream-generated Variants markers. Preserve inherited attribution, license notices, and Git history while removing upstream product destinations from active installation, support, update, and contribution flows.

Use the approved **B, Feedback Window** logo direction: a blue speech-window shape with a lower-left dialogue tail, upper-right opening, and detached square representing a selected feedback point.

## User Stories

1. As the maintainer, I want Pinvelto to have its own identity, so that I can pursue its product direction independently.
2. As an internal user, I want the extension name and action title to say Pinvelto, so that I can identify the installed product.
3. As an internal user, I want consistent Pinvelto branding in software messages and documentation, so that I do not confuse it with upstream.
4. As an internal user, I want the approved Feedback Window logo across product surfaces, so that I can recognize Pinvelto quickly.
5. As an internal user, I want the icon to remain recognizable at 16 pixels and on light and dark backgrounds, so that it works in browser chrome and documentation.
6. As an internal user, I want reproducible local extension and server installation instructions, so that I can install Pinvelto without public distribution services.
7. As an internal user, I want installation to use this repository's server and extension, so that it never silently installs upstream instead.
8. As an internal user, I want a documented deliberate update procedure and local version information, so that I can control internal upgrades.
9. As the maintainer, I want public npm publication removed from automation and package publishing disabled, so that internal development does not publish this product accidentally.
10. As an internal user, I want upstream version polling and upgrade prompts removed, so that upstream releases do not direct Pinvelto updates.
11. As an internal user, I want the local command to be named pinvelto, so that installation, startup, status, and shutdown use one clear identity.
12. As an internal user, I want Pinvelto startup and shutdown to manage only its own service, so that an upstream installation is not disturbed.
13. As an internal user, I want an occupied endpoint or a different product's service to be identified correctly, so that Pinvelto does not attach to the wrong server.
14. As an internal user, I want Pinvelto to use independent storage and settings, so that it starts fresh without reading upstream state.
15. As an internal user, I want old installations, configuration entries, and data left untouched, so that establishing Pinvelto does not remove unrelated local state.
16. As a coding-agent user, I want the MCP configuration and server identity to be pinvelto, so that the agent can distinguish the service from other integrations.
17. As a coding agent, I want every exposed tool to use the pinvelto_ prefix and feedback-oriented naming, so that I can select the right tool without confusing it with native annotation tools.
18. As a coding agent, I want tool descriptions and generated instructions to clearly describe Pinvelto webpage Feedback, so that the intended workflow is unambiguous.
19. As an internal user, I want to create and review Feedback on webpages, so that independent branding preserves the product's core usefulness.
20. As an internal user, I want screenshots and attachments to remain usable through the browser and MCP workflow, so that agents receive the necessary visual context.
21. As an internal user, I want agent updates to Feedback reflected in the extension, so that I can follow the result of agent work.
22. As an internal user, I want design previews, review controls, filters, counts, and deletion behavior to continue working, so that the identity change does not regress everyday use.
23. As an internal user, I want new Pinvelto exports to identify their product and preserve their supported workflows, so that exported Feedback remains useful.
24. As an internal user, I want new Pinvelto Variants generation, selection, finalization, and cleanup to work, so that I can continue exploring design alternatives.
25. As the maintainer, I want no legacy migration or compatibility layer, so that the fork has no obligation to maintain upstream historical formats or identifiers.
26. As an internal user, I want help and documentation to describe Pinvelto installation, use, and troubleshooting, so that I can resolve problems without relying on upstream documentation.
27. As an internal user, I want the existing website to serve as internal documentation without store promotion or upstream user-count claims, so that it accurately describes this product.
28. As a contributor, I want contribution and issue-reporting guidance to target this project, so that project work is not sent upstream.
29. As the maintainer, I want upstream retained as a read source with accidental-push safeguards, so that I can evaluate useful changes without resuming upstream contribution.
30. As the maintainer, I want each proposed upstream adoption assessed and traceable to source commits, so that I can decide whether it fits Pinvelto.
31. As the maintainer, I want inherited source attribution, license notices, and Git history preserved, so that independent branding does not erase provenance.
32. As the maintainer, I want repository renaming and local-directory relocation deferred until implementation acceptance, so that those operations do not disrupt active development.

## Implementation Decisions

- Establish one brand, **Pinvelto**, across the extension, local service, CLI, workspace packages, documentation website, generated output, agent guidance, and project metadata.
- Use `pinvelto` for the MCP configuration name, server identity, and CLI. Register only `pinvelto_`-prefixed tools with feedback-oriented names. Preserve existing tool capabilities and clear argument semantics; exact signatures are implementation choices, not a reason to retain old aliases.
- Use **Feedback** for user-facing and agent-facing records. Preserve precise concepts such as pins, design previews, and Variants. Update the domain vocabulary consistently as these names reach product surfaces.
- Give new runtime endpoints, service identity checks, storage, process files, extension/page bridges, DOM integration identifiers, and generated code markers independent Pinvelto identities. Choose a non-conflicting default service endpoint and use it consistently across the extension, service, CLI, and MCP setup.
- Reject or report another product's service at a candidate endpoint rather than treating a generic healthy response as Pinvelto. Startup, status, and shutdown must not manage an upstream process.
- Start with empty Pinvelto state. Provide no old-data import or migration, no old configuration rewrite, no upstream export compatibility, no old command/tool aliases, and no upstream Variants-marker compatibility. Do not read, overwrite, or delete existing upstream state as part of initialization.
- Keep Pinvelto's own newly created Feedback, attachments, exports, and Variants working. Preserve existing behavior outside the explicitly agreed identity, isolation, delivery, and terminology changes.
- Install and run locally built artifacts from this repository. Make packages internal-only, remove public publishing automation and public publishing configuration, and remove flows that download an upstream npm package or open its browser-store listing.
- Remove upstream version polling and upgrade prompts. Keep local version information and document deliberate internal updates.
- Convert the existing marketing website into internal documentation covering installation, usage, and troubleshooting. Update built-in help and project-owned documentation destinations without inventing a hosted domain or requiring website deployment.
- Remove upstream store promotion, user-count claims, marketing material, and contribution destinations. Project issue reports and contributions target this repository.
- Produce formal logo assets from the approved B concept rather than using the presentation board as an icon. Preserve its blue direction and key geometry, with monochrome and light/dark-background support. Replace necessary brand colors and assets without redesigning the existing interface layout.
- Preserve inherited license and attribution notices and Git history. Old names remain acceptable where required for notices or accurate provenance, but not as active Pinvelto installation, support, update, or contribution destinations. Do not relabel inherited code as MIT or infer license compliance solely from internal use.
- Retain an upstream read remote and add safeguards against accidental upstream pushes. Do not submit project changes as upstream pull requests or automatically synchronize upstream.
- Assess each upstream adoption for the problem solved, fit with Pinvelto, license changes, effects on existing features/data, and test evidence. Prefer specific commits or independent adaptations over bulk synchronization, record source commits, and obtain maintainer confirmation of the assessment before adoption.
- Defer the eventual remote repository rename and local-directory relocation to `pinvelto` until implementation acceptance; perform them as separate operations.

## Testing Decisions

- Confirmed primary acceptance seam: a fresh-install, real browser-extension to local service to MCP workflow. Create Feedback with a screenshot or attachment in the extension, enumerate and read it using the Pinvelto MCP tools, update it through MCP, and verify the visible result in the extension. Assert the MCP server identity and complete exposed-tool list at this public boundary, including absence of old tool aliases.
- Reuse the existing Playwright real-extension fixtures and local webpage fixtures rather than introduce a parallel browser harness. Prior art covers actual extension entry, toolbar/screenshots, keyboard and session behavior, review interactions, and settings/documentation navigation. Current coverage is a foundation, not proof that the full proposed browser-to-MCP workflow already exists.
- Extend the primary acceptance fixture only where necessary to run the actual local service and an MCP client with isolated temporary state. Prefer this single integrated harness to new seams inside toolbar or server internals.
- Use public CLI/service boundaries for lifecycle and isolation cases that the browser workflow cannot prove: new MCP configuration, startup/status/shutdown, endpoint conflict, another product's health response, existing upstream-like state remaining unchanged, and no automatic old-state import. Run spawned processes against isolated temporary homes, ports, and configuration; never use the maintainer's actual running services or agent configuration.
- Reuse the server's Node test runner and existing real HTTP/temporary-filesystem testing approach as prior art. Do not substitute mocks for protocol exchange, persisted Feedback, or process ownership behavior being accepted.
- Reuse existing extension behavioral regression tests for review, keyboard/focus, screenshots/attachments, deletion, and design controls. Cover new Pinvelto exports and Variants generation/selection/finalization/cleanup through their observable outputs and workflow; legacy import compatibility is deliberately not tested or implemented.
- Build affected packages and verify internal installation instructions against a clean temporary environment. Check that the fresh-install/update path does not contact upstream npm, store, or release/version endpoints; do not turn this into a blanket prohibition on network access to project-owned resources.
- Inspect the actual extension and documentation UI for Pinvelto identity, useful help destinations, and absence of upstream product promotion. Verify final logo assets at real 16/32/48/128-pixel sizes plus monochrome and light/dark backgrounds; the concept board alone is not acceptance evidence.
- Audit delivery configuration for absence of public publishing jobs and effective package publishing prevention. Review old-name findings with explicit license/provenance exceptions rather than demand zero textual matches or create brittle source-text replacement tests.
- Good tests assert external behavior, visible outcomes, protocol contracts, data isolation, and installation results. They must fail for meaningful regressions, not mirror implementation names or assert that a mechanical replacement happened.
- Record automated and visual verification evidence plus any remaining acceptance gaps. Passing source tests alone does not establish that the installed product, logo, and documentation are correct.

## Out of Scope

- Migration or compatibility for old configuration, data, attachments, exports, command/tool aliases, or upstream-generated Variants artifacts.
- Removal of existing installations, agent configuration entries, or old local data.
- Public npm or browser-store publication, a hosted deployment, domain purchase, or a public marketing launch.
- Remote repository renaming and active local-workspace relocation during this implementation.
- A general UI redesign, new product features, or functional changes unrelated to the agreed independence scope.
- Automatic upstream merges, bulk synchronization as a default, or upstream pull requests.
- Relicensing inherited code, deleting required attribution, rewriting Git history, or claiming legal clearance from a brand change or internal-use decision.

## Further Notes

The maintainer explicitly approved the Pinvelto name, internal-use distribution boundary, independent runtime identity, branded MCP tools, and B logo concept. The later decision to carry no historical baggage supersedes all earlier migration and legacy-compatibility proposals.

The repository contains the selected B concept board and the accepted independence ADR, glossary updates, and scope document. Include those agreed materials in implementation delivery; do not restart the branding interview or reopen the selected logo direction.

The maintainer confirmed the testing seams above: the browser-to-MCP acceptance workflow, CLI/HTTP isolation checks, and delivery/documentation/visual verification. The specification is ready for implementation without further product interviews.
