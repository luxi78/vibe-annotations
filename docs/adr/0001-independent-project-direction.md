# Maintain an independent project with selective upstream adoption

The maintainer has chosen to develop this project independently because changes considered essential to its product direction have generally not been accepted by RaphaelRegnier/vibe-annotations. Work on this project will no longer be submitted as pull requests to that upstream; new upstream commits may be adopted only after explicit evaluation.

The fork is intended for internal use, with no public browser-extension or npm-package distribution planned. This distribution boundary records the maintainer's intended scope and is not a conclusion about license compliance.

Documentation, user-facing software messages, project naming, and the logo will establish one independent brand: **Pinvelto**. The MCP configuration and server identity will be `pinvelto`; exposed tools will use the `pinvelto_` prefix and feedback-oriented names, with no old tool-name aliases registered, to distinguish this product from upstream and agents' own annotation features. The local CLI will be named `pinvelto`.

Pinvelto will start with an independent runtime identity and storage. There will be no migration of old configuration or data, no legacy export import support, and no compatibility aliases or handling for upstream-generated Variants markers. This supersedes the earlier migration proposal; it does not authorize deleting existing installations or data.

Internal installation, documentation, repository handling, upstream evaluation, and the visual-design scope are settled in [the implementation specification](../pinvelto-independence.md). The project retains its Git history and inherited license and attribution notices while establishing its independent product identity.
