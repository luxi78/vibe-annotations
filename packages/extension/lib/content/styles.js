// All Pinvelto V2 CSS as a JS constant
// Loaded synchronously into the shadow root — no async fetch needed

export const PINVELTO_STYLES = `
/* ===== Reset inside shadow ===== */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ===== Theme tokens (dark only) ===== */
:host {
  /* Core surfaces */
  --v-surface: #0C0E12;
  --v-surface-1: #191D24;
  --v-text-primary: #fcfcfd;
  --v-text-secondary: #9AA4B2;
  --v-outline: #ffffff0d;
  --v-outline-highlight: #ffffff26;
  --v-surface-hover: #fcfcfd14;
  --v-secondary-btn-bg: #ffffff0d;
  --v-textarea-bg: #ffffff0d;

  /* Accent */
  --v-accent: #75A2FF;
  --v-on-accent: #ffffff;

  /* Semantic */
  --v-warning: #f79009;
  --v-on-warning: #ffffff;
  --v-warning-container: #f7900914;
  --v-on-warning-container: #f79009;
  --v-danger: #dc2626;
  --v-danger-hover: #dc26261a;
  --v-highlight: #3b82f6;
  --v-badge-bg: #0754FF;
  --v-tooltip-bg: #1f2937;
  --v-primary-btn: #4f5d75;

  /* Glass toolbar */
  --v-toolbar-bg: rgba(15, 17, 21, 0.97);
  --v-toolbar-border: rgba(255,255,255,0.08);
  --v-toolbar-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04);
  --v-toolbar-text: #d4d4d8;
  --v-toolbar-text-active: #fafafa;
  --v-toolbar-btn-hover: rgba(255,255,255,0.05);
  --v-toolbar-btn-active: rgba(255,255,255,0.07);

  /* Toolbar elements */
  --v-separator: rgba(255,255,255,0.08);
  --v-kbd-bg: rgba(255,255,255,0.08);
  --v-kbd-border: rgba(255,255,255,0.1);
  --v-pill-gradient: #0754FF;
  --v-instruction-text: #71717a;
  --v-dot-separator: #3f3f46;
  --v-close-icon: #52525b;
  --v-capture-accent: #8b5cf6;

  /* Status */
  --v-status-online: #10b981;
  --v-status-watching: #3b82f6;
  --v-status-offline: #52525b;

  /* Panels */
  --v-panel-bg: rgba(15, 17, 21, 0.97);
  --v-panel-shadow: 0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04);
  --v-design-change: #818cf8;
  --v-card-hover: rgba(255,255,255,0.03);
  --v-muted-text: #27272a;

  /* Typography */
  --v-font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --v-font-mono: 'SF Mono', Monaco, Inconsolata, 'Fira Code', monospace;

  /* Radii */
  --v-radius-xs: 4px;
  --v-radius-sm: 8px;
  --v-radius-md: 12px;
  --v-radius-lg: 16px;
  --v-radius-full: 9999px;

  font-family: var(--v-font);
  font-size: 14px;
  line-height: 1.5;
  color: var(--v-text-primary);
}

/* ===== Animations ===== */
@keyframes pinvelto-card-exit {
  from { opacity: 1; transform: translateX(0); max-height: 80px; }
  to   { opacity: 0; transform: translateX(-40px); max-height: 0; padding-top: 0; padding-bottom: 0; }
}

@keyframes pinvelto-toolbar-enter {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes pinvelto-toolbar-exit {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-12px); }
}

@keyframes pinvelto-fade-in {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes pinvelto-slide-up {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes pinvelto-slide-down {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes pinvelto-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

/* ===== Inspection highlight overlay ===== */
.pinvelto-highlight {
  position: fixed;
  pointer-events: none;
  border: 2px solid rgba(59, 130, 246, 0.6);
  border-radius: 2px;
  background: rgba(59, 130, 246, 0.06);
  transition: all 0.1s ease;
  z-index: 1;
}

/* brief selector hint on the hover highlight — sits just above the rect's
   top-left, or inside it when the element hugs the top of the viewport */
.pinvelto-inspect-label {
  position: absolute;
  left: -2px;
  bottom: 100%;
  margin-bottom: 3px;
  max-width: 340px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #3b82f6;
  color: #fff;
  font-family: var(--v-font-mono);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}
.pinvelto-inspect-label--inside {
  bottom: auto;
  top: 2px;
  margin-bottom: 0;
}

/* ===== Badges (numbered pins) ===== */
.pinvelto-badge {
  position: fixed;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--v-badge-bg);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--v-font);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  cursor: pointer;
  z-index: 5;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  transform: translateX(-50%);
  user-select: none;
}

.pinvelto-badge:hover {
  transform: translateX(-50%) scale(1.15);
  box-shadow: 0 3px 12px rgba(0,0,0,0.25);
}

.pinvelto-badge.targeted {
  animation: pinvelto-pulse 0.6s ease 3;
  box-shadow: 0 0 0 3px var(--v-highlight), 0 2px 8px rgba(0,0,0,0.18);
}

.pinvelto-badge-label {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.pinvelto-badge.watching {
  animation: pinvelto-watch-pulse 2s ease-in-out infinite;
}

@keyframes pinvelto-watch-pulse {
  0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.18); }
  50% { box-shadow: 0 2px 8px rgba(0,0,0,0.18), 0 0 0 3px rgba(59,130,246,0.3); }
}

/* Badge tooltip */
.pinvelto-badge-tooltip {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--v-tooltip-bg);
  color: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 400;
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease, visibility 0.15s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 20;
}

.pinvelto-badge-tooltip::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 5px solid var(--v-tooltip-bg);
}

.pinvelto-badge:hover .pinvelto-badge-tooltip {
  opacity: 1;
  visibility: visible;
}

/* ===== Feedback popover ===== */
.pinvelto-popover-anchor {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto;
  z-index: 10;
  cursor: default !important;
}

.pinvelto-popover {
  pointer-events: auto;
  width: 340px;
  background: var(--v-panel-bg);
  border: 1px solid var(--v-toolbar-border);
  border-radius: var(--v-radius-md);
  box-shadow: var(--v-panel-shadow);
  animation: pinvelto-slide-up 0.2s ease forwards;
  overflow: visible;
  cursor: default !important;
}

.pinvelto-popover.dragging {
  user-select: none;
}

/* Drag handle (iPhone drawer style) */
.pinvelto-drag-handle {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
  cursor: grab;
}
.pinvelto-drag-handle::after {
  content: '';
  width: 40%;
  height: 4px;
  border-radius: 2px;
  background: var(--v-outline-highlight);
  transition: background 0.15s ease;
}
.pinvelto-drag-handle:hover::after { background: var(--v-text-secondary); }
.pinvelto-drag-handle:active { cursor: grabbing; }

/* Popover title */
.pinvelto-popover-title {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 14px 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--v-text-secondary);
}
.pinvelto-popover-title code {
  font-family: var(--v-font-mono);
  font-size: 11px;
  color: var(--v-text-primary);
}

/* Tab bar (pills) — single-line, scrollable */
.pinvelto-tab-bar {
  display: flex;
  gap: 4px;
  padding: 4px 14px 8px;
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.pinvelto-tab-bar::-webkit-scrollbar { display: none; }
.pinvelto-tab {
  padding: 3px 10px;
  background: none;
  border: 1px solid var(--v-outline);
  border-radius: var(--v-radius-full);
  color: var(--v-text-secondary);
  font-family: var(--v-font);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: color .15s, background .15s, border-color .15s;
}
.pinvelto-tab:hover { color: var(--v-text-primary); border-color: var(--v-outline-highlight); }
.pinvelto-tab.active { color: var(--v-on-accent); background: var(--v-pill-gradient); border-color: transparent; }

/* Tab panels */
.pinvelto-tab-panel { padding-top: 4px; }

/* Raw CSS textarea */
.pinvelto-raw-css {
  width: 100%;
  min-height: 120px;
  max-height: 200px;
  resize: vertical;
  font-family: var(--v-font-mono);
  font-size: 11px;
  line-height: 1.5;
  color: var(--v-text-primary);
  background: var(--v-textarea-bg);
  border: 1px solid var(--v-outline);
  border-radius: var(--v-radius-xs);
  padding: 8px;
  outline: none;
  white-space: pre;
  overflow-x: auto;
  tab-size: 2;
  box-sizing: border-box;
}
.pinvelto-raw-css:focus { border-color: var(--v-accent); }

/* Raw CSS panel sections */
.pinvelto-raw-css-section { margin-bottom: 8px; }
.pinvelto-raw-css-section:last-child { margin-bottom: 0; }
.pinvelto-raw-css-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  padding: 2px 0;
  cursor: pointer;
  width: 100%;
  text-align: left;
  font-family: var(--v-font);
}
.pinvelto-raw-css-toggle:hover .pinvelto-raw-css-label { color: var(--v-text-primary); }
.pinvelto-raw-css-chevron {
  display: flex;
  align-items: center;
  color: var(--v-text-secondary);
  transition: transform 0.15s ease;
  transform: rotate(0deg);
  flex-shrink: 0;
}
.pinvelto-raw-css-chevron.open { transform: rotate(90deg); }
.pinvelto-raw-css-collapsible { margin-top: 4px; }
.pinvelto-raw-css-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--v-text-secondary);
  display: inline;
}
.pinvelto-raw-css-hint { font-weight: 400; opacity: 0.6; }
.pinvelto-css-rules {
  width: 100%;
  min-height: 100px;
  max-height: 200px;
  resize: vertical;
  font-family: var(--v-font-mono);
  font-size: 11px;
  line-height: 1.5;
  color: var(--v-text-primary);
  background: var(--v-textarea-bg);
  border: 1px solid var(--v-outline);
  border-radius: var(--v-radius-xs);
  padding: 8px;
  outline: none;
  white-space: pre;
  overflow-x: auto;
  tab-size: 2;
  box-sizing: border-box;
}
.pinvelto-css-rules:focus { border-color: var(--v-accent); }

/* Design toolbar */
.pinvelto-design-toolbar {
  padding: 6px 14px;
  border-bottom: 1px solid var(--v-outline);
}

/* Intent mode bar (Comment / Design / Variants) */
.pinvelto-mode-bar {
  display: flex;
  gap: 6px;
  padding: 4px 14px 10px;
}
.pinvelto-mode-tab {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 8px;
  background: var(--v-surface-1);
  border: 1px solid var(--v-outline);
  border-radius: var(--v-radius-sm);
  color: var(--v-text-secondary);
  font: 500 11.5px/1 var(--v-font);
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}
.pinvelto-mode-tab svg { width: 13px; height: 13px; flex-shrink: 0; }
.pinvelto-mode-tab:not(:disabled):hover { color: var(--v-text-primary); background: var(--v-toolbar-btn-hover); border-color: var(--v-outline-highlight); }
.pinvelto-mode-tab.active { color: var(--v-text-primary); background: var(--v-toolbar-btn-active); border-color: var(--v-outline-highlight); }
.pinvelto-mode-tab:disabled { opacity: 0.45; cursor: not-allowed; }
.pinvelto-mode-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--v-design-change);
  opacity: 0;
  transition: opacity 0.15s;
}
.pinvelto-mode-dot.on { opacity: 1; }

/* Mode panels */
.pinvelto-mode-panel { padding: 0 14px 4px; }
.pinvelto-mode-panel[hidden] { display: none; }
.pinvelto-mode-panel[data-mode="comment"] { padding-top: 2px; }

/* Design edit — vertical accordion */
.pinvelto-design-accordion {
  max-height: 300px;
  overflow-y: auto;
  padding-top: 2px;
}
.pinvelto-design-section {
  border-top: 1px solid var(--v-outline);
  padding: 6px 0;
}
.pinvelto-design-section:first-child { border-top: none; }
.pinvelto-design-sec-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  background: none;
  border: none;
  padding: 2px 0;
  cursor: pointer;
}
.pinvelto-design-sec-chevron {
  display: inline-flex;
  color: var(--v-text-secondary);
  transform: rotate(0deg);
  transition: transform 0.15s ease;
}
.pinvelto-design-sec-chevron.open { transform: rotate(90deg); }
.pinvelto-design-sec-label { font: 500 11.5px/1 var(--v-font); color: var(--v-text-primary); }
.pinvelto-design-sec-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--v-design-change);
  margin-left: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}
.pinvelto-design-sec-dot.on { opacity: 1; }
.pinvelto-design-sec-body { padding: 6px 0 2px; }

/* Variants mode */
.pinvelto-variants-explain {
  margin: 8px 2px 0;
  font: 400 11px/1.4 var(--v-font);
  color: var(--v-instruction-text);
}
.pinvelto-variants-input {
  width: 100%;
  min-height: 64px;
  padding: 10px;
  border: 1px solid var(--v-outline);
  border-radius: var(--v-radius-sm);
  background: var(--v-textarea-bg);
  color: var(--v-text-primary);
  font: 400 13px/1.4 var(--v-font);
  resize: vertical;
  box-sizing: border-box;
  transition: border-color 0.15s, background 0.15s;
}
.pinvelto-variants-input:focus { outline: none; border-color: var(--v-highlight); background: var(--v-surface-hover); }
.pinvelto-variants-input::placeholder { color: var(--v-text-secondary); }

.pinvelto-design-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.pinvelto-design-row + .pinvelto-design-row {
  margin-top: 5px;
}

.pinvelto-design-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--v-text-secondary);
  flex-shrink: 0;
}

.pinvelto-design-icon svg {
  width: 12px;
  height: 12px;
}

.pinvelto-stepper {
  display: flex;
  align-items: center;
  border: 1px solid var(--v-outline);
  border-radius: var(--v-radius-xs);
  background: var(--v-textarea-bg);
}

.pinvelto-stepper-input {
  width: 36px;
  height: 22px;
  text-align: center;
  border: none;
  background: none;
  font-family: var(--v-font-mono);
  font-size: 11px;
  color: var(--v-text-primary);
  outline: none;
  -moz-appearance: textfield;
  padding: 0;
}

.pinvelto-stepper-input::-webkit-inner-spin-button,
.pinvelto-stepper-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.pinvelto-stepper-unit {
  font-family: var(--v-font-mono);
  font-size: 10px;
  color: var(--v-text-secondary);
  padding: 0 5px 0 0;
  user-select: none;
}

/* Content (text edit) textarea */
.pinvelto-content-row { align-items: flex-start; }
.pinvelto-content-icon { padding-top: 4px; }
.pinvelto-content-input {
  flex: 1;
  width: 0;
  min-height: 22px;
  max-height: calc(11px * 1.5 * 8 + 10px); /* ~8 lines */
  border: 1px solid var(--v-outline);
  border-radius: var(--v-radius-xs);
  background: var(--v-textarea-bg);
  font-family: var(--v-font-mono);
  font-size: 11px;
  line-height: 1.5;
  color: var(--v-text-primary);
  padding: 3px 6px;
  outline: none;
  box-sizing: border-box;
  min-width: 0;
  resize: none;
  overflow-y: auto;
}
.pinvelto-content-input:focus { border-color: var(--v-accent); }

.pinvelto-align-group {
  display: flex;
  border: 1px solid var(--v-outline);
  border-radius: var(--v-radius-xs);
  overflow: hidden;
}

.pinvelto-align-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-right: 1px solid var(--v-outline);
  color: var(--v-text-secondary);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  padding: 0;
}

.pinvelto-align-btn:last-child {
  border-right: none;
}

.pinvelto-align-btn:hover {
  background: var(--v-surface-hover);
}

.pinvelto-align-btn.active {
  background: var(--v-surface-hover);
  color: var(--v-text-primary);
}

.pinvelto-align-btn svg {
  width: 12px;
  height: 12px;
}

.pinvelto-design-reset {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-left: auto;
  padding: 0;
  border: none;
  border-radius: var(--v-radius-xs);
  background: none;
  color: var(--v-text-secondary);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, visibility 0s;
  visibility: hidden;
}

.pinvelto-design-reset:hover {
  color: var(--v-text-primary);
  background: var(--v-surface-hover);
}

/* Toggle group (display block/flex, flex direction) */
.pinvelto-toggle-group { display:flex; border:1px solid var(--v-outline); border-radius:var(--v-radius-xs); overflow:hidden; }
.pinvelto-toggle-btn { height:22px; padding:0 6px; background:none; border:none; border-right:1px solid var(--v-outline); color:var(--v-text-secondary); cursor:pointer; font-family:var(--v-font); font-size:11px; font-weight:500; transition:background .15s,color .15s; display:flex; align-items:center; justify-content:center; }
.pinvelto-toggle-btn:last-child { border-right:none; }
.pinvelto-toggle-btn:hover { background:var(--v-surface-hover); }
.pinvelto-toggle-btn.active { background:var(--v-surface-hover); color:var(--v-text-primary); }
.pinvelto-toggle-btn svg { width:12px; height:12px; }

/* Padding split toggle */
.pinvelto-split-btn { width:22px; height:22px; display:flex; align-items:center; justify-content:center; background:none; border:1px solid var(--v-outline); border-radius:var(--v-radius-xs); color:var(--v-text-secondary); cursor:pointer; margin-left:auto; flex-shrink:0; padding:0; }
.pinvelto-split-btn:hover { background:var(--v-surface-hover); color:var(--v-text-primary); }
.pinvelto-split-btn.active { background:var(--v-surface-hover); color:var(--v-text-primary); }

/* Smaller stepper for split-4 padding */
.pinvelto-stepper-sm { flex:1; min-width:0; }
.pinvelto-stepper-sm .pinvelto-stepper-input, .pinvelto-stepper-sm .pinvelto-stepper-text { width:100%; }

/* Sizing rows — label+field pairs with extra spacing */
.pinvelto-sizing-row { display:flex; align-items:center; gap:10px; }
.pinvelto-sizing-row + .pinvelto-sizing-row { margin-top:5px; }
.pinvelto-sizing-pair { display:flex; align-items:center; gap:4px; flex:1; min-width:0; }

/* Padding V/H text inputs */
.pinvelto-stepper-text { width:56px; height:22px; text-align:center; border:none; background:none; font-family:var(--v-font-mono); font-size:11px; color:var(--v-text-primary); outline:none; padding:0; }

/* Section headers (Padding / Margin / Flow) */
.pinvelto-section-header { display:flex; align-items:center; justify-content:space-between; margin-top:6px; margin-bottom:3px; }
.pinvelto-section-header:first-child { margin-top:0; }
.pinvelto-section-label { font-family:var(--v-font); font-size:10px; font-weight:500; color:var(--v-text-secondary); letter-spacing:0.01em; }

/* Grow stepper to fill available width */
.pinvelto-stepper-grow { flex:1; min-width:0; }
.pinvelto-stepper-grow .pinvelto-stepper-text { width:100%; }

/* Flex/Grid option sections */
.pinvelto-flex-options { margin-top:6px; }
.pinvelto-grid-options { margin-top:6px; }

/* Prop spacer — visual gap between inline icon+field groups */
.pinvelto-prop-spacer { width:8px; flex-shrink:0; }

/* Spacing rows — split button fixed, inputs flex */
.pinvelto-spacing-row { display:flex; align-items:center; gap:5px; }
.pinvelto-spacing-row + .pinvelto-spacing-row { margin-top:5px; }
.pinvelto-spacing-inputs { flex:1; min-width:0; display:flex; align-items:center; gap:5px; }

/* Flow toggle group — equal width buttons */
.pinvelto-flow-group { width:100%; }
.pinvelto-flow-group .pinvelto-toggle-btn { flex:1; padding:0 6px; height:24px; }
.pinvelto-flow-group .pinvelto-toggle-btn svg { width:14px; height:14px; }

/* Layout split — matrix left, controls right */
.pinvelto-layout-split { display:flex; gap:12px; align-items:flex-start; margin-top:6px; }
.pinvelto-layout-left { flex:1; min-width:0; }
.pinvelto-layout-right { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; }
.pinvelto-gap-row { margin-top:4px; align-items:center; }
.pinvelto-gap-label { font-family:var(--v-font); font-size:11px; color:var(--v-text-secondary); white-space:nowrap; flex-shrink:0; margin-right:4px; }
.pinvelto-gap-input-row .pinvelto-stepper-input { flex:1; width:auto; }
.pinvelto-gap-input-row.disabled { opacity:0.35; pointer-events:none; }

/* Checkbox labels (Reverse order / Wrap items) */
.pinvelto-check-label { display:flex; align-items:center; gap:6px; cursor:pointer; font-family:var(--v-font); font-size:11px; color:var(--v-text-secondary); white-space:nowrap; user-select:none; padding:4px 0; }
.pinvelto-check-label input[type="checkbox"] { appearance:none; -webkit-appearance:none; width:14px; height:14px; margin:0; border:1.5px solid var(--v-text-secondary); border-radius:3px; background:none; cursor:pointer; flex-shrink:0; position:relative; transition:background .12s, border-color .12s; }
.pinvelto-check-label input[type="checkbox"]:checked { background:var(--v-accent); border-color:var(--v-accent); }
.pinvelto-check-label input[type="checkbox"]:checked::after { content:''; position:absolute; left:3.5px; top:1px; width:4px; height:7px; border:solid #fff; border-width:0 1.5px 1.5px 0; transform:rotate(45deg); }

/* 3×3 alignment matrix */
.pinvelto-align-matrix { display:grid; grid-template-columns:repeat(3,1fr); gap:2px; border:1px solid var(--v-outline); border-radius:var(--v-radius-sm); overflow:hidden; background:var(--v-textarea-bg); padding:3px; width:100%; }
.pinvelto-matrix-cell { height:18px; display:flex; align-items:center; justify-content:center; background:none; border:none; border-radius:3px; cursor:pointer; padding:0; transition:background .12s; }
.pinvelto-matrix-cell:hover { background:var(--v-surface-hover); }
.pinvelto-matrix-cell.active { background:var(--v-surface-hover); }
.pinvelto-matrix-dot { width:4px; height:4px; border-radius:50%; background:var(--v-text-secondary); opacity:0.5; transition:all .12s; }
.pinvelto-matrix-cell.active .pinvelto-matrix-dot { background:var(--v-accent); opacity:1; transform:scale(1.4); }

/* T/R/B/L labels */
.pinvelto-design-icon-label { display:flex; align-items:center; justify-content:center; color:var(--v-text-secondary); font-family:var(--v-font-mono); font-size:9px; font-weight:600; width:12px; flex-shrink:0; }
.pinvelto-design-icon-label-wide { width:auto; }

/* Color picker */
.pinvelto-color-row { display:flex; align-items:center; gap:6px; }
.pinvelto-color-swatch { width:20px; height:20px; border-radius:4px; border:1px solid var(--v-outline); cursor:pointer; padding:0; flex-shrink:0; position:relative; }
.pinvelto-color-swatch:hover { border-color:var(--v-outline-highlight); }
.pinvelto-color-input { width:70px; height:22px; border:1px solid var(--v-outline); border-radius:var(--v-radius-xs); background:var(--v-textarea-bg); font-family:var(--v-font-mono); font-size:10px; color:var(--v-text-primary); padding:0 6px; outline:none; }
.pinvelto-color-input:focus { border-color:var(--v-accent); }
.pinvelto-color-input-inline { width:58px; }

/* Color palette dropdown */
.pinvelto-color-palette { position:absolute; bottom:calc(100% + 4px); left:0; background:var(--v-surface); border:1px solid var(--v-outline); border-radius:var(--v-radius-sm); padding:6px; display:grid; grid-template-columns:repeat(auto-fill,22px); gap:4px; z-index:10; box-shadow:0 4px 12px rgba(0,0,0,.12); min-width:120px; max-width:240px; }
.pinvelto-color-palette-swatch { width:22px; height:22px; border-radius:4px; border:1px solid var(--v-outline); cursor:pointer; padding:0; transition:transform .1s; }
.pinvelto-color-palette-swatch:hover { transform:scale(1.15); border-color:var(--v-outline-highlight); }
.pinvelto-color-palette-swatch.active { outline:2px solid var(--v-accent); outline-offset:1px; }
.pinvelto-color-palette-empty { font-size:11px; color:var(--v-text-secondary); padding:4px; grid-column:1/-1; }

/* Warning bar */
.pinvelto-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 14px;
  padding: 8px 10px;
  background: var(--v-warning-container);
  border-radius: 6px;
  font-size: 12px;
  color: var(--v-on-warning-container);
}

.pinvelto-warning svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Textarea */
.pinvelto-popover-body {
  padding: 10px 14px;
}

/* the wrapper IS the visual field: the textarea scrolls inside it and the
   footer row (+ button, kbd hint) sits in flow below — text can never overlap it */
.pinvelto-input-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--v-outline);
  border-radius: var(--v-radius-sm);
  background: var(--v-textarea-bg);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.pinvelto-input-wrap:focus-within {
  border-color: var(--v-highlight);
  background: var(--v-surface-hover);
}

.pinvelto-textarea {
  display: block; /* avoid the inline-block baseline gap under the field (misaligns the + button) */
  width: 100%;
  min-height: 60px;
  padding: 10px 10px 4px;
  border: none;
  background: transparent;
  color: var(--v-text-primary);
  font-family: var(--v-font);
  font-size: 13px;
  line-height: 1.45;
  resize: none; /* the grip in the footer row is the resize handle */
  overflow-y: auto;
}

.pinvelto-textarea:focus {
  outline: none;
}

.pinvelto-textarea::placeholder {
  color: var(--v-text-secondary);
}

.pinvelto-input-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  /* extra right padding reserves the bottom-right corner for the resize grip */
  padding: 0 22px 5px 5px;
}

.pinvelto-kbd-hint {
  font-size: 10px;
  color: var(--v-text-secondary);
  opacity: 0.7;
  pointer-events: none;
}

/* resize handle pinned flush to the field's bottom-right corner (like a native
   textarea grip). The wrap is position:relative, so this anchors to its corner. */
.pinvelto-resize-grip {
  position: absolute;
  right: 0;
  bottom: 0;
  box-sizing: border-box;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 3px;
  color: var(--v-text-secondary);
  cursor: ns-resize;
  touch-action: none;
  transition: color 0.15s ease;
}
.pinvelto-resize-grip:hover { color: var(--v-text-primary); }

/* Attachment "+" menu — in the comment field's footer row */
.pinvelto-add-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--v-radius-sm);
  background: transparent;
  color: var(--v-text-secondary);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}
.pinvelto-add-btn svg { transition: transform 0.2s ease; }
.pinvelto-add-btn:hover { color: var(--v-text-primary); background: var(--v-surface-hover); }
.pinvelto-add-btn.open { color: var(--v-text-primary); background: var(--v-surface-hover); }
.pinvelto-add-btn.open svg { transform: rotate(45deg); }
.pinvelto-add-menu {
  position: absolute;
  left: 6px;
  bottom: 38px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  min-width: 172px;
  padding: 4px;
  background: var(--v-panel-bg);
  border: 1px solid var(--v-outline-highlight);
  border-radius: var(--v-radius-sm);
  box-shadow: var(--v-panel-shadow);
}
.pinvelto-add-menu[hidden] { display: none; }
.pinvelto-add-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  background: none;
  border: none;
  border-radius: var(--v-radius-xs);
  color: var(--v-text-primary);
  font: 500 12.5px/1 var(--v-font);
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
}
.pinvelto-add-opt:hover { background: var(--v-surface-hover); }
.pinvelto-add-opt svg { color: var(--v-text-secondary); flex-shrink: 0; }

/* Actions footer */
.pinvelto-popover-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px 12px;
  gap: 8px;
}
.pinvelto-footer-left {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pinvelto-footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pinvelto-viewport-info {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--v-text-secondary);
  font-family: var(--v-font-mono);
  white-space: nowrap;
}
.pinvelto-viewport-info svg { flex-shrink: 0; }

/* ===== Buttons ===== */
.pinvelto-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: var(--v-radius-full);
  font-family: var(--v-font);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.15s ease, opacity 0.15s ease, color 0.15s ease;
  user-select: none;
}

.pinvelto-btn svg {
  width: 16px;
  height: 16px;
}

.pinvelto-btn-primary {
  background: var(--v-pill-gradient);
  color: #fff;
}

.pinvelto-btn-primary:hover { opacity: 0.88; }

.pinvelto-btn-primary:disabled {
  background: var(--v-text-secondary);
  color: var(--v-surface);
  cursor: not-allowed;
  opacity: 0.4;
}

.pinvelto-btn-secondary {
  background: transparent;
  color: var(--v-text-secondary);
}

.pinvelto-btn-secondary:hover {
  color: var(--v-text-primary);
}

.pinvelto-btn-icon {
  background: transparent;
  color: var(--v-text-secondary);
  padding: 6px;
  border: none;
  border-radius: var(--v-radius-xs);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;
}

.pinvelto-btn-icon:hover {
  color: var(--v-danger);
  background: var(--v-danger-hover);
}

/* ===== Floating toolbar (glass dark) ===== */
.pinvelto-toolbar {
  position: fixed;
  top: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--v-toolbar-bg);
  border: 1px solid var(--v-toolbar-border);
  border-radius: 12px;
  padding: 4px;
  pointer-events: auto;
  box-shadow: var(--v-toolbar-shadow);
  z-index: 50;
  user-select: none;
  cursor: default;
  transition: box-shadow 0.2s ease;
  overflow: visible;
  animation: pinvelto-toolbar-enter 0.25s cubic-bezier(0.4, 0, 0.2, 1) both;
}

.pinvelto-toolbar.exiting {
  animation: pinvelto-toolbar-exit 0.2s cubic-bezier(0.4, 0, 0.2, 1) both;
}

.pinvelto-toolbar:hover {
  box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
}

.pinvelto-toolbar.dragging {
  cursor: grabbing;
  box-shadow: 0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08);
}

/* Release banner — sits just below the toolbar after an update */
.pinvelto-update-banner {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 440px;
  padding: 8px 10px 8px 12px;
  background: var(--v-toolbar-bg);
  border: 1px solid var(--v-toolbar-border);
  border-radius: 10px;
  box-shadow: var(--v-toolbar-shadow);
  font-size: 12px;
  line-height: 1.4;
  color: var(--v-text-primary);
  cursor: default;
  animation: pinvelto-update-banner-in 0.28s cubic-bezier(0.4, 0, 0.2, 1) both;
}

.pinvelto-update-banner.pinvelto-update-banner-out {
  animation: pinvelto-update-banner-out 0.18s ease both;
}

.pinvelto-update-text {
  flex: 1;
  color: var(--v-text-secondary);
}

.pinvelto-update-text strong {
  color: var(--v-text-primary);
  font-weight: 600;
}

.pinvelto-update-link {
  flex-shrink: 0;
  padding: 5px 10px;
  border-radius: 7px;
  background: var(--v-pill-gradient);
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: filter 0.15s ease;
}

.pinvelto-update-link:hover {
  filter: brightness(1.08);
}

.pinvelto-update-dismiss {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--v-text-tertiary);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.pinvelto-update-dismiss:hover {
  background: rgba(255,255,255,0.08);
  color: var(--v-text-primary);
}

.pinvelto-update-dismiss svg {
  width: 14px;
  height: 14px;
}

/* Refresh requirement banner — persistent (not dismissible) until the page reloads */
.pinvelto-refresh-banner {
  border-color: var(--v-accent);
}

.pinvelto-refresh-action {
  flex-shrink: 0;
  padding: 5px 10px;
  border: none;
  border-radius: 7px;
  background: var(--v-pill-gradient);
  color: #fff;
  font: inherit;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: filter 0.15s ease;
}

.pinvelto-refresh-action:hover {
  filter: brightness(1.08);
}

@keyframes pinvelto-update-banner-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes pinvelto-update-banner-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-6px); }
}

/* Toolbar logo */
.pinvelto-toolbar-logo {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  flex-shrink: 0;
  pointer-events: none;
  margin: 0 4px;
}

/* Toolbar separator */
.pinvelto-toolbar-separator {
  width: 1px;
  height: 18px;
  background: var(--v-separator);
  margin: 0 2px;
  flex-shrink: 0;
}

/* Toolbar spacer (between pill and next button) */
.pinvelto-toolbar-spacer {
  width: 8px;
  flex-shrink: 0;
}

/* Labeled toolbar buttons */
.pinvelto-toolbar-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 8px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--v-toolbar-text);
  font: 500 13px/1 var(--v-font);
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  position: relative;
}

.pinvelto-toolbar-btn:hover {
  background: var(--v-toolbar-btn-hover);
  color: var(--v-toolbar-text-active);
}

.pinvelto-toolbar-btn.active {
  background: var(--v-toolbar-btn-active);
  color: var(--v-toolbar-text-active);
}

.pinvelto-toolbar-btn svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.pinvelto-toolbar-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pinvelto-toolbar-btn:disabled:hover {
  background: transparent;
  color: var(--v-toolbar-text);
}

/* Close button */
.pinvelto-toolbar-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--v-close-icon);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.pinvelto-toolbar-close:hover {
  color: var(--v-toolbar-text);
  background: var(--v-toolbar-btn-hover);
}

.pinvelto-toolbar-close svg {
  width: 14px;
  height: 14px;
}

/* Count pill (gradient badge on View all) */
.pinvelto-toolbar-pill {
  position: absolute;
  top: -3px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  border-radius: 9px;
  background: var(--v-badge-bg);
  color: #fff;
  font: 600 10px/1 var(--v-font);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  pointer-events: none;
}

/* MCP status in toolbar */
.pinvelto-toolbar-status {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s ease;
}

.pinvelto-toolbar-status:hover {
  background: var(--v-toolbar-btn-hover);
}

.pinvelto-toolbar-status svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

/* Default vs Annotating mode containers */
/* Annotating mode morph — the middle section crossfades + width transitions */
.pinvelto-toolbar-middle {
  position: relative;
  display: flex;
  align-items: center;
  overflow: visible;
}

.pinvelto-toolbar-default,
.pinvelto-toolbar-annotating {
  display: flex;
  align-items: center;
  white-space: nowrap;
  /* Opacity transitions are driven by JS for precise sequencing */
}

.pinvelto-toolbar-default {
  position: relative;
}

.pinvelto-toolbar-annotating {
  opacity: 0;
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  gap: 6px;
}

.pinvelto-toolbar.annotating .pinvelto-toolbar-default {
  opacity: 0;
  visibility: hidden;
  height: 0;
  overflow: hidden;
  position: absolute;
  pointer-events: none;
}

.pinvelto-toolbar.annotating .pinvelto-toolbar-annotating {
  opacity: 1;
  position: relative;
  left: auto;
  top: auto;
  transform: none;
  pointer-events: auto;
}

/* Kbd elements in annotating mode */
.pinvelto-toolbar-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  background: var(--v-kbd-bg);
  border: 1px solid var(--v-kbd-border);
  border-radius: 5px;
  font: 500 11px/1 var(--v-font-mono);
  color: var(--v-toolbar-text);
}

.pinvelto-toolbar-instruction {
  font: 450 12px/1 var(--v-font);
  color: var(--v-instruction-text);
}

.pinvelto-toolbar-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--v-dot-separator);
  flex-shrink: 0;
}

/* MCP status dot (settings dropdown) */
.pinvelto-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.pinvelto-status-dot.online  { background: var(--v-status-online); }
.pinvelto-status-dot.offline { background: var(--v-status-offline); }

/* ===== View All panel ===== */
.pinvelto-viewall-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 100%;
  min-width: 340px;
  max-height: min(calc(100vh - 120px), 500px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--v-panel-bg);
  border: 1px solid var(--v-toolbar-border);
  border-radius: 12px;
  box-shadow: var(--v-panel-shadow);
  animation: pinvelto-slide-up 0.15s ease forwards;
  pointer-events: auto;
  z-index: 100;
}

.pinvelto-viewall-panel.above {
  top: auto;
  bottom: calc(100% + 8px);
  animation-name: pinvelto-slide-down;
}

.pinvelto-viewall-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.pinvelto-viewall-url {
  color: var(--v-toolbar-text-active);
  font: 500 12px/1 var(--v-font-mono);
}

.pinvelto-viewall-site-picker {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
  margin-right: 8px;
}

.pinvelto-viewall-site-select {
  background: var(--v-surface-1, rgba(255, 255, 255, 0.06));
  color: var(--v-toolbar-text-active);
  border: 1px solid var(--v-toolbar-border, rgba(255, 255, 255, 0.12));
  border-radius: 6px;
  padding: 3px 6px;
  font: 500 12px/1.2 var(--v-font-mono);
  cursor: pointer;
  outline: none;
  max-width: 220px;
  text-overflow: ellipsis;
}

.pinvelto-viewall-site-select:focus-visible {
  border-color: var(--v-accent, #75A2FF);
  box-shadow: 0 0 0 2px rgba(217, 119, 87, 0.2);
}

.pinvelto-viewall-site-select option {
  background: var(--v-panel-bg, #1a1a1a);
  color: var(--v-toolbar-text, #e0e0e0);
}

.pinvelto-viewall-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pinvelto-viewall-actions button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--v-close-icon);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.pinvelto-viewall-actions button:hover {
  color: var(--v-toolbar-text);
  background: var(--v-toolbar-btn-hover);
}

.pinvelto-viewall-actions button.pinvelto-viewall-deleteall:hover {
  color: var(--v-danger);
}

.pinvelto-viewall-actions button svg {
  width: 13px;
  height: 13px;
}

/* View all filter tabs */
.pinvelto-viewall-tabs {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.15);
}

.pinvelto-viewall-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--v-text-secondary);
  font: 500 11px/1.2 var(--v-font);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.pinvelto-viewall-tab:hover {
  color: var(--v-toolbar-text);
  background: var(--v-toolbar-btn-hover, rgba(255, 255, 255, 0.08));
}

.pinvelto-viewall-tab.active {
  color: var(--v-toolbar-text-active, #fff);
  background: var(--v-surface-1, rgba(255, 255, 255, 0.1));
  border-color: rgba(255, 255, 255, 0.12);
}

.pinvelto-viewall-tab:focus-visible {
  outline: none;
  border-color: var(--v-accent, #75A2FF);
  box-shadow: 0 0 0 2px rgba(217, 119, 87, 0.2);
}

/* The list scrolls independently; the global destructive action stays separate. */
.pinvelto-viewall-routes {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.pinvelto-viewall-footer {
  flex-shrink: 0;
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pinvelto-viewall-global-action {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pinvelto-viewall-delete-global {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--v-danger);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.pinvelto-viewall-delete-global:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.08);
  border-color: var(--v-danger);
}

.pinvelto-viewall-delete-global:focus-visible {
  outline: 2px solid var(--v-danger);
  outline-offset: 2px;
}

.pinvelto-viewall-delete-global:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pinvelto-viewall-global-caption {
  flex: 1;
  min-width: 0;
  color: var(--v-text-secondary);
  font: 400 12px/1.4 var(--v-font);
}

.pinvelto-viewall-global-status {
  color: var(--v-text-secondary);
  font: 400 11px/1.4 var(--v-font);
}

.pinvelto-viewall-global-status:empty { display: none; }

/* In-place recoverable read failure feedback */
.pinvelto-viewall-error {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(239, 68, 68, 0.12);
  border-bottom: 1px solid rgba(239, 68, 68, 0.25);
  color: var(--v-danger, #ef4444);
  font: 400 12px/1.4 var(--v-font);
}

.pinvelto-viewall-retry {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font: 500 11px/1.2 var(--v-font);
  cursor: pointer;
  white-space: nowrap;
}

.pinvelto-viewall-retry:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* Route group */
.pinvelto-viewall-route-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px 6px 16px;
}

.pinvelto-viewall-route-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pinvelto-viewall-route-path {
  color: var(--v-text-secondary);
  font: 500 11px/1 var(--v-font-mono);
  letter-spacing: 0.02em;
}

.pinvelto-viewall-route-count {
  padding: 0 5px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  color: var(--v-dot-separator);
  font: 500 10px/18px var(--v-font);
}

.pinvelto-viewall-route-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: var(--v-close-icon);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.pinvelto-viewall-route-header:hover .pinvelto-viewall-route-clear {
  opacity: 1;
}

.pinvelto-viewall-route-clear:hover {
  color: var(--v-danger);
  background: var(--v-toolbar-btn-hover);
}

.pinvelto-viewall-route-clear svg {
  width: 12px;
  height: 12px;
}

.pinvelto-viewall-empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--v-instruction-text);
  font-size: 13px;
}

/* Feedback card */
.pinvelto-viewall-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.1s ease;
  overflow: hidden;
}

.pinvelto-viewall-card.deleting {
  animation: pinvelto-card-exit 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  pointer-events: none;
}

.pinvelto-viewall-card:hover {
  background: var(--v-card-hover);
}

.pinvelto-viewall-card-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.pinvelto-viewall-selector {
  color: var(--v-text-secondary);
  font: 400 10.5px/1.3 var(--v-font-mono);
}

.pinvelto-viewall-comment {
  color: var(--v-toolbar-text);
  font: 450 12.5px/1.4 var(--v-font);
}

.pinvelto-viewall-comment.empty {
  color: var(--v-muted-text);
  font-style: italic;
  font-size: 11px;
}

.pinvelto-viewall-design {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--v-design-change);
  font: 500 12px/1 var(--v-font);
}

.pinvelto-viewall-design svg {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

/* Variant lifecycle chip — states awaiting agent action */
.pinvelto-viewall-status {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  margin-top: 4px;
  padding: 2px 7px;
  border-radius: 5px;
  font: 600 10.5px/1.3 var(--v-font);
  letter-spacing: 0.01em;
  border: 1px solid transparent;
}
.pinvelto-viewall-status.discarded {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.28);
}
.pinvelto-viewall-status.chosen {
  color: var(--v-status-online);
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.28);
}
.pinvelto-viewall-status.ready {
  color: var(--v-status-watching);
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.28);
}

.pinvelto-viewall-card-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: var(--v-close-icon);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease, color 0.15s ease, background 0.15s ease;
  margin-top: 1px;
  flex-shrink: 0;
}

.pinvelto-viewall-card:hover .pinvelto-viewall-card-delete {
  opacity: 1;
}

.pinvelto-viewall-card-delete:hover {
  color: var(--v-danger);
  background: var(--v-toolbar-btn-hover);
}

.pinvelto-viewall-card-delete svg {
  width: 12px;
  height: 12px;
}

/* ===== Settings dropdown ===== */
.pinvelto-settings-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 100%;
  min-width: 280px;
  background: var(--v-panel-bg);
  border: 1px solid var(--v-toolbar-border);
  border-radius: 12px;
  box-shadow: var(--v-panel-shadow);
  animation: pinvelto-slide-up 0.15s ease forwards;
  overflow: hidden;
  pointer-events: auto;
  z-index: 100;
}

.pinvelto-settings-dropdown.above {
  top: auto;
  bottom: calc(100% + 10px);
  animation-name: pinvelto-slide-down;
}

.pinvelto-settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--v-outline);
}

.pinvelto-settings-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--v-text-primary);
  font-family: var(--v-font-mono);
}

.pinvelto-settings-version {
  font-size: 11px;
  color: var(--v-text-secondary);
  margin-left: 8px;
  font-weight: 400;
  text-decoration: none;
  cursor: pointer;
}
.pinvelto-settings-version:hover {
  text-decoration: underline;
}

.pinvelto-settings-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pinvelto-theme-btn {
  background: none;
  border: none;
  padding: 4px;
  border-radius: var(--v-radius-xs);
  cursor: pointer;
  color: var(--v-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease, background 0.15s ease;
}

.pinvelto-theme-btn:hover {
  color: var(--v-text-primary);
  background: var(--v-surface-hover);
}

.pinvelto-theme-btn svg {
  width: 16px;
  height: 16px;
}

.pinvelto-settings-body {
  padding: 6px 0;
  max-height: min(calc(100vh - 120px), 600px);
  overflow-y: auto;
}

.pinvelto-settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  font-size: 13px;
  color: var(--v-text-primary);
}

.pinvelto-settings-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pinvelto-settings-item-left svg {
  width: 16px;
  height: 16px;
  color: var(--v-text-secondary);
  flex-shrink: 0;
}

.pinvelto-settings-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pinvelto-settings-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 13px;
  color: var(--v-text-secondary);
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  font-family: var(--v-font);
}

.pinvelto-settings-link:hover {
  color: var(--v-text-primary);
  background: var(--v-surface-hover);
}

.pinvelto-settings-link svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.pinvelto-settings-separator {
  height: 1px;
  background: var(--v-outline);
  margin: 4px 0;
}

/* Color dot picker */
.pinvelto-color-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  transition: border-color 0.15s ease;
}
.pinvelto-color-dot:hover {
  border-color: rgba(255,255,255,0.4);
}
.pinvelto-color-dot.active {
  border-color: #fff;
}

/* Get started guide */
.pinvelto-guide {
  padding: 8px 14px 12px;
}
.pinvelto-guide-section {
  margin-bottom: 12px;
}
.pinvelto-guide-section:last-child {
  margin-bottom: 0;
}
.pinvelto-guide-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--v-text-primary);
  margin-bottom: 6px;
}
.pinvelto-guide-text {
  font-size: 12px;
  color: var(--v-text-secondary);
  line-height: 1.4;
  margin: 0 0 6px;
}
.pinvelto-guide-text strong {
  color: var(--v-text-primary);
  font-weight: 600;
}
.pinvelto-guide-cmd {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--v-surface-2);
  border: 1px solid var(--v-outline);
  border-radius: 6px;
  padding: 6px 8px;
  margin-bottom: 6px;
}
.pinvelto-guide-cmd code {
  font-family: var(--v-font-mono);
  font-size: 11px;
  color: var(--v-text-primary);
  flex: 1;
  overflow-x: auto;
  white-space: nowrap;
}
.pinvelto-guide-copy {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--v-text-secondary);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
}
.pinvelto-guide-copy:hover {
  color: var(--v-text-primary);
}
.pinvelto-guide-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.pinvelto-guide-tab {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--v-outline);
  background: none;
  color: var(--v-text-secondary);
  cursor: pointer;
  font-family: inherit;
}
.pinvelto-guide-tab:hover {
  color: var(--v-text-primary);
  border-color: var(--v-outline-highlight);
}
.pinvelto-guide-tab.active {
  background: var(--v-accent);
  color: #fff;
  border-color: var(--v-accent);
}
.pinvelto-guide-panel {
  display: none;
}
.pinvelto-guide-panel.active {
  display: block;
}

/* Toggle switch */
.pinvelto-toggle {
  position: relative;
  width: 32px;
  height: 18px;
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s ease;
  border: none;
  padding: 0;
  flex-shrink: 0;
}

.pinvelto-toggle.on {
  background: var(--v-accent);
}

.pinvelto-toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #71717a;
  transition: transform 0.2s ease, background 0.2s ease;
}

.pinvelto-toggle.on::after {
  transform: translateX(14px);
  background: #fafafa;
}

/* ===== Shortcut button ===== */
.pinvelto-shortcut-btn {
  background: var(--v-surface-hover);
  border: 1px solid var(--v-outline);
  border-radius: 4px;
  padding: 2px 8px;
  font-family: var(--v-font);
  font-size: 12px;
  font-weight: 500;
  color: var(--v-text-secondary);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  min-width: 48px;
  text-align: center;
}
.pinvelto-shortcut-btn:hover { border-color: var(--v-text-secondary); color: var(--v-text-primary); }
.pinvelto-shortcut-btn.recording { border-color: var(--v-accent); color: var(--v-accent); }

/* ===== Target highlight (around element being annotated) ===== */
.pinvelto-target-highlight {
  position: fixed;
  pointer-events: none;
  border: 2px solid var(--v-highlight);
  border-radius: 3px;
  background: rgba(37, 99, 235, 0.05);
  z-index: 2;
  transition: all 0.15s ease;
}

/* ===== Confirm dialog ===== */
.pinvelto-confirm-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  pointer-events: auto;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pinvelto-fade-in 0.15s ease;
}

.pinvelto-confirm {
  background: var(--v-panel-bg);
  border: 1px solid var(--v-toolbar-border);
  border-radius: var(--v-radius-md);
  padding: 20px;
  width: 320px;
  box-shadow: var(--v-panel-shadow);
}

.pinvelto-confirm-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--v-text-primary);
  margin-bottom: 8px;
}

.pinvelto-confirm-msg {
  font-size: 13px;
  color: var(--v-text-secondary);
  margin-bottom: 16px;
}

.pinvelto-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.pinvelto-btn-danger {
  background: var(--v-danger);
  color: #fff;
}

.pinvelto-btn-danger:hover {
  opacity: 0.9;
}

/* ===== Permission modal (shown on public sites before access is granted) ===== */
.pinvelto-permission-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  pointer-events: auto;
  animation: pinvelto-permission-fade-in 0.15s ease;
}

.pinvelto-permission-modal {
  width: 360px;
  max-width: calc(100vw - 40px);
  padding: 24px;
  background: var(--v-panel-bg, var(--v-surface-1));
  border: 1px solid var(--v-toolbar-border, var(--v-outline));
  border-radius: var(--v-radius-md, 8px);
  box-shadow: var(--v-panel-shadow, 0 16px 48px rgba(0,0,0,0.45));
  font-family: var(--v-font);
  color: var(--v-toolbar-text, var(--v-text-primary));
  text-align: left;
}

.pinvelto-permission-logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  margin-bottom: 12px;
  display: block;
}

.pinvelto-permission-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 6px;
  color: var(--v-text-primary);
}

.pinvelto-permission-body {
  font-size: 13px;
  line-height: 1.45;
  margin: 0 0 16px;
  color: var(--v-text-secondary);
}

.pinvelto-permission-body strong {
  color: var(--v-text-primary);
  font-weight: 600;
  word-break: break-all;
}

.pinvelto-permission-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pinvelto-permission-btn {
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  font: 500 13px/1 var(--v-font);
  cursor: pointer;
  transition: filter 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.pinvelto-permission-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.pinvelto-permission-primary {
  background: var(--v-pill-gradient);
  color: #fff;
}

.pinvelto-permission-primary:hover:not(:disabled) {
  filter: brightness(1.05);
}

.pinvelto-permission-secondary {
  background: var(--v-surface-hover);
  color: var(--v-text-primary);
}

.pinvelto-permission-secondary:hover:not(:disabled) {
  background: var(--v-outline-highlight);
}

.pinvelto-permission-cancel {
  background: transparent;
  color: var(--v-text-secondary);
}

.pinvelto-permission-cancel:hover:not(:disabled) {
  color: var(--v-text-primary);
}

.pinvelto-permission-status {
  margin-top: 10px;
  font-size: 12px;
  color: var(--v-text-secondary);
  min-height: 14px;
}

@keyframes pinvelto-permission-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ===== Image attachments ===== */
.pinvelto-attach-btn {
  position: absolute;
  right: 6px;
  top: 6px;
  width: 26px;
  height: 26px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--v-text-secondary);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}
.pinvelto-attach-btn:hover {
  color: var(--v-text-primary);
  background: var(--v-surface-hover);
}

.pinvelto-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.pinvelto-attachments.empty { display: none; }

.pinvelto-att-tile {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  /* visible so the remove button can overhang the corner without being clipped;
     the media rounds itself via its own border-radius */
  overflow: visible;
  border: 1px solid var(--v-toolbar-border, var(--v-outline));
  background: var(--v-surface-1);
  cursor: pointer;
  flex: 0 0 auto;
}
.pinvelto-att-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 7px;
}
.pinvelto-att-chip {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font: 500 9px/1 var(--v-font);
  color: var(--v-text-secondary);
  border-radius: 7px;
}
.pinvelto-att-unavailable .pinvelto-att-img { display: none; }
.pinvelto-att-unavailable::after {
  content: "missing";
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font: 500 9px/1 var(--v-font);
  color: var(--v-text-secondary);
  background: var(--v-surface-1);
  border-radius: 7px;
}
/* Always-visible close button overhanging the top-right corner, ringed against
   the panel so it never blends into the image and is never clipped. */
.pinvelto-att-remove {
  position: absolute;
  top: -7px;
  right: -7px;
  width: 18px;
  height: 18px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(20, 20, 20, 0.92);
  border: none;
  border-radius: 50%;
  box-shadow: 0 0 0 2px var(--v-panel-bg, var(--v-surface-1));
  cursor: pointer;
  z-index: 3;
  transition: background 0.12s ease;
}
.pinvelto-att-remove:hover { background: var(--v-badge-bg, #0754FF); }

/* ===== Share / export dropdown (View all header) ===== */
.pinvelto-viewall-share {
  position: relative;
  display: inline-flex;
}
/* fixed so the View all panel's overflow can't clip it (position set in JS) */
.pinvelto-viewall-share-menu {
  position: fixed;
  width: 200px;
  padding: 5px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--v-panel-bg);
  border: 1px solid var(--v-toolbar-border);
  border-radius: 12px;
  box-shadow: var(--v-panel-shadow);
  z-index: 101;
  pointer-events: auto;
}
.pinvelto-viewall-share-menu[hidden] { display: none; }
.pinvelto-share-opt {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  color: var(--v-toolbar-text);
  font: 500 13px/1.2 var(--v-font);
}
.pinvelto-share-opt:hover { background: var(--v-surface-hover); }
.pinvelto-share-opt strong { font-weight: 600; color: var(--v-toolbar-text-active); }
.pinvelto-share-opt span { font-size: 11px; color: var(--v-text-secondary); font-weight: 400; }

/* ===== Create variants toggle (Feedback popover) ===== */
.pinvelto-variants-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding: 5px 11px;
  background: var(--v-surface-1);
  border: 1px solid var(--v-toolbar-border, var(--v-outline));
  border-radius: 999px;
  color: var(--v-text-secondary);
  font: 500 12px/1 var(--v-font);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}
.pinvelto-variants-toggle[hidden] { display: none; }
.pinvelto-variants-toggle:disabled { opacity: 0.45; cursor: not-allowed; }
.pinvelto-variants-toggle:not(:disabled):hover { color: var(--v-text-primary); border-color: var(--v-text-secondary); }
.pinvelto-variants-toggle.on {
  color: #fff;
  background: var(--v-pill-gradient);
  border-color: transparent;
}

/* ===== Variants review (browse + choose) ===== */
.pinvelto-variants-review { padding: 12px 16px 4px; }
.pinvelto-variants-hint { margin: 0 0 10px; font-size: 12px; color: var(--v-text-secondary); }
.pinvelto-variants-warn { margin: 0; padding: 8px 0; font-size: 12px; line-height: 1.5; color: var(--v-text-secondary); }
.pinvelto-variant-list { display: flex; flex-direction: column; gap: 4px; }
.pinvelto-variant-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 1.5px solid var(--v-toolbar-border, var(--v-outline));
  border-radius: 8px;
  background: var(--v-surface-1);
  cursor: pointer;
  font: 500 13px/1 var(--v-font);
  color: var(--v-toolbar-text);
  transition: border-color 0.12s ease;
}
.pinvelto-variant-row:hover { border-color: var(--v-text-secondary); }
/* Gradient stroke (matching the CTA) via the double-background border trick,
   which keeps the rounded corners unlike border-image. */
.pinvelto-variant-row.active {
  border-color: transparent;
  background:
    linear-gradient(var(--v-surface-1), var(--v-surface-1)) padding-box,
    var(--v-pill-gradient) border-box;
}
.pinvelto-variant-row input { accent-color: var(--v-accent, #75A2FF); margin: 0; }

`;
