# Pinvelto Feedback Window assets

Production geometry is authored in `scripts/generate-brand-assets.cjs`, derived
from the approved [B concept](../pinvelto-logo-b-concept.png). The concept board
is retained as a reference and is never used as an application icon.

Run `pnpm install --frozen-lockfile` and `node scripts/generate-brand-assets.cjs`
from the repository root to regenerate the checked-in assets. The generator
uses Next.js's existing Sharp dependency and does not fetch or generate artwork
from an external service. PNGs have transparent padding; ICO contains the same
native 16/32/48/128 PNG images.

## Identity

- Blue mark: `#0754FF`, for browser icons and light surfaces.
- Dark-surface blue: `#75A2FF`, for the dark extension toolbar and documentation.
- Monochrome variants: `#11151B` and white.
- Preserve the lower-left dialogue tail, open upper-right corner, and detached
  feedback square. Keep the square distinct at native 16-pixel size.
- The extension retains its existing layout. Default pins, action badges, and
  primary controls now use blue. Existing user color choices remain available.
- The documentation header pairs the mark with live Pinvelto text, using its
  existing Cabinet Grotesk font rather than embedding a raster wordmark.

## Verification — 2026-10-27

The public acceptance seam is the installed browser extension and rendered
documentation surface approved in specification #23.

1. The new real-extension Playwright identity test failed first because the
   installed manifest still reported Vibe Annotations. After implementation,
   it passed for the Pinvelto name, action title, four native icon sizes, and
   visible, successfully loaded toolbar image with its accessible name.
2. Extension production build passed. Brand identity E2E: 1 passed. Existing
   extension entry E2E: 2 passed. Existing extension unit regressions: 198 passed.
3. Website TypeScript check and production build passed (32 generated routes).
4. Rendered images were inspected at device scale factor 1. An initial opaque
   raster-padding defect was found visually and corrected before the final
   captures. The final small marks retain a separate square and open corner.
5. The integration coordinator independently inspected the final actual-size,
   toolbar, and documentation-header captures and confirmed the geometry and
   visible identity.
6. The Impeccable detector reported only the pre-existing spring easing token
   in global website CSS. It was left unchanged because motion is outside this
   ticket's brand-asset scope.

Evidence:

- [Native sizes on light/dark surfaces and monochrome variants](actual-size-review.png)
- [Loaded extension toolbar](extension-toolbar.png)
- [Rendered documentation header](documentation-header.png)
- [Documentation capture context](documentation-context.png)

The loaded-extension manifest and icon resource were verified in full Chromium
with a fresh temporary profile; no OS browser-toolbar screenshot was captured.
Documentation content, its existing Download action, inherited marketing
assets, and upstream metadata are intentionally deferred to ticket #28. This
ticket verifies shared logo wiring, not acceptance of that later content.
