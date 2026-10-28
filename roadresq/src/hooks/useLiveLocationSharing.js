import { useEffect } from "react";
import { useSocket } from "../context/SocketContext";

/**
 * EXPERIMENT 2 + 8 — custom hook: while a mechanic is on a job, send
 * their position to the server every few seconds so the customer's
 * tracker updates live. Does nothing unless `enabled` and the position
 * is real GPS (never broadcasts the fallback location).
 */
export default function useLiveLocationSharing({ requestId, enabled, location, isFallback, intervalMs = 5000 }) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!enabled || !socket || !requestId || isFallback) return undefined;

    const send = () => socket.emit("mechanic:location", { requestId, lat: location.lat, lng: location.lng });
    send();
    const id = setInterval(send, intervalMs);
    return () => clearInterval(id);
  }, [enabled, socket, requestId, isFallback, location.lat, location.lng, intervalMs]);
}
