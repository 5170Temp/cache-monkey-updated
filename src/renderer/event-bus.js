const listeners = new Map();

export default {
  on(event, listener) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(listener);
  },

  off(event, listener) {
    listeners.get(event)?.delete(listener);
  },

  emit(event, ...args) {
    for (const listener of listeners.get(event) || []) listener(...args);
  }
};
