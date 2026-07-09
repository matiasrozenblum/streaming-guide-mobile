type Listener = () => void;

const listeners: Record<string, Listener[]> = {};

export const tokenEvents = {
  on(event: string, listener: Listener) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(listener);
  },
  off(event: string, listener: Listener) {
    listeners[event] = (listeners[event] || []).filter((l) => l !== listener);
  },
  emit(event: string) {
    (listeners[event] || []).forEach((l) => l());
  },
};
