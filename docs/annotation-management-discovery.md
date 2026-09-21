# Cross-site annotation management discovery

Status: implemented; interaction decisions reflect the latest user feedback.

## Verified current behavior

- View all filters shared extension storage to the current origin, groups by pathname, and excludes resolved annotations.
- Origin includes scheme, hostname, and port; different localhost ports have separate scopes.
- The browser action toggles a page overlay. There is no independent global management page.
- Agent completion and Clear on copy may delete annotations. Managing existing records does not recover deleted history.

Evidence: `packages/extension/lib/content/api-bridge.js`, `packages/extension/lib/content/floating-toolbar.js`, `packages/extension/entrypoints/background.js`, and architecture and copy-paste documentation under `packages/website/src/app/docs/`.

## User-confirmed direction

- Use the existing View all panel for cross-site management.
- Replace the site heading with a selector when multiple sites have annotations.
- Include sites with annotations as options, and distinguish the current site with an icon.
- Selecting a site displays that site's annotations.
- Allow deleting individual annotations or all annotations for the selected site, including other sites.

Cross-device synchronization, historical retention, and standalone comment editing are not part of the confirmed change.

## Confirmed interaction decisions

1. Initial selection and an empty current site: select the current site on opening and retain it as an empty option. Show the selector whenever another site is available. Reuse the existing `No annotations yet` empty state.
2. Header actions and counts: scope panel copy, export, and deletion to the selected site, while retaining the toolbar badge as the current site's count.
3. Row activation: do not open pages or tabs when clicking annotations. Existing current-page behavior scrolls to an element and targets its badge; preserve that behavior only for annotations belonging to the current page. Other-page annotations must not target coincidentally matching selectors in the current document.
4. Deletion aftermath: when deletion leaves a selected non-current site with no annotations, immediately switch back to the current site. This applies to deleting the last card, clearing the last route, whole-site deletion, and Clear on copy. Always retain the current site. Confirm whole-site deletion with site identity and affected count.

The user accepted decisions 1, 2, and 4 and explicitly rejected navigation in decision 3. No ADR is warranted for these reversible UI decisions.
