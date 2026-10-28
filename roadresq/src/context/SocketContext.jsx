import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { getSocketUrl, TOKEN_KEY } from "../lib/api";

/**
 * EXPERIMENT 8 — one authenticated WebSocket per logged-in user
 * ------------------------------------------------------------------
 * The socket is created when a user logs in (the JWT travels in the
 * handshake `auth` payload, exactly like the REST Authorization
 * header) and torn down on logout. Components read `socket` and
 * `connected` from context and subscribe to events with useSocketEvent.
 */
const SocketContext = createContext({ socket: null, connected: false });

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!user || !token) return undefined;

    const s = io(getSocketUrl(), { auth: { token }, transports: ["websocket", "polling"] });
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    setSocket(s);

    return () => {
      s.removeAllListeners();
      s.close();
      setSocket(null);
      setConnected(false);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
