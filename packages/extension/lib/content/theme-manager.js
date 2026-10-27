// Dark-only theme manager — tokens are defined in styles.js (:host rules).
// This module just emits the theme event; no inline style overrides needed.

import PinveltoEvents from './event-bus.js';

function init() {
  PinveltoEvents.emit('theme:changed', 'dark');
}

function apply() { init(); }
function getEffective() { return 'dark'; }
function getPreference() { return 'dark'; }
function setPreference() {}

const PinveltoThemeManager = { init, apply, getEffective, getPreference, setPreference };
export default PinveltoThemeManager;
