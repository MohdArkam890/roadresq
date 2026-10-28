import { useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";

/**
 * EXPERIMENT 2 + 8 — custom hook: subscribe to a socket event.
 * The handler is kept in a ref so callers can pass an inline function
 * without re-subscribing on every render; the effect only re-runs when
 * the socket or event name changes, and always unsubscribes on cleanup.
 */
export default function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const saved = useRef(handler);

  useEffect(() => {
    saved.current = handler;
  });

  useEffect(() => {
    if (!socket) return undefined;
    const listener = (...args) => saved.current(...args);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}
