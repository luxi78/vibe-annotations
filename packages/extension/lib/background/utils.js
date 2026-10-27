// Pinvelto Feedback ID generation

export function generateId() {
  return 'pinvelto_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

