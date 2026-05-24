type Listener = () => void;

const listeners = new Set<Listener>();

export function emitAuthLogout() {
  listeners.forEach(fn => fn());
}

export function subscribeAuthLogout(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
