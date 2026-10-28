// Minimal stand-in for a socket.io-client socket: lets a test "push" events
// from the server and inspect what the client emitted.
export function createFakeSocket() {
  const handlers = {};
  const emitted = [];
  return {
    emitted,
    on(event, fn) { (handlers[event] ||= new Set()).add(fn); },
    off(event, fn) { handlers[event]?.delete(fn); },
    emit(event, payload, ack) {
      emitted.push({ event, payload });
      if (typeof ack === "function") ack({ ok: true });
    },
    serverEmit(event, payload) { handlers[event]?.forEach((fn) => fn(payload)); },
    listenerCount(event) { return handlers[event]?.size ?? 0; },
  };
}
