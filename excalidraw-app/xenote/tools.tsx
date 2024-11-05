export interface Listeners {
  [key: string]: Set<(obj: any) => void>;
}

export class Emitter {
  private listeners: Listeners = {};

  on(event: string, fn: (obj: any) => void): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    const listeners = this.listeners[event];
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  emit(event: string, value?: any) {
    if (!this.listeners[event]) {
      return;
    }
    // cloning set so that any new set entries would be ignored
    const listeners = new Set(this.listeners[event]);
    listeners.forEach((fn) => fn(value));
  }

  destroy() {
    for (const event in this.listeners) {
      const listeners = this.listeners[event];
      listeners.forEach((fn) => listeners.delete(fn));
    }
  }
}