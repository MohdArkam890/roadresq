import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import api from "../lib/api";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";
import useSocketEvent from "../hooks/useSocketEvent";
import { pushNotification } from "../store/notificationsSlice";

/**
 * EXPERIMENT 2/3 (Context) + EXPERIMENT 4/6/8 (real backend + WebSockets)
 * ------------------------------------------------------------------------
 * A Context rather than a Redux slice because it is one shared object
 * (the customer's single active request) read by both the Navbar and
 * the Customer Dashboard.
 *
 * Source of truth is the database:
 *  - on login the active (or just-finished, unrated) request is restored,
 *    so a page refresh no longer loses it
 *  - the server pushes `request:update` over the WebSocket the instant a
 *    mechanic changes the status — no polling while the socket is up
 *  - if the socket drops, a slow poll keeps things correct until it
 *    reconnects
 */

export const REQUEST_STEPS = [
  "requested",
  "matched",
  "on_the_way",
  "arrived",
  "in_progress",
  "completed",
  "cancelled",
];

export const STEP_LABELS = {
  requested: "Requested",
  matched: "Mechanic found",
  on_the_way: "On the way",
  arrived: "Arrived",
  in_progress: "Service in progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ACTIVE = "requested,matched,on_the_way,arrived,in_progress";
const FINISHED = ["completed", "cancelled"];

const RequestContext = createContext(null);

export function RequestProvider({ children }) {
  const { user } = useAuth();
  const { connected } = useSocket();
  const dispatch = useDispatch();

  const [request, setRequest] = useState(null);
  const [mechanicLocation, setMechanicLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastStatus = useRef(null);

  const isCustomer = user?.role === "customer";

  // ---- useEffect: restore the customer's request after login / page refresh ----
  useEffect(() => {
    if (!isCustomer) {
      setRequest(null);
      setMechanicLocation(null);
      return undefined;
    }
    let cancelled = false;

    (async () => {
      try {
        const [active] = await api.listRequests(`?status=${ACTIVE}&limit=1`);
        if (cancelled) return;
        if (active) return setRequest(active);

        // nothing active — if the last job finished but was never rated, bring it back for rating
        const [done] = await api.listRequests("?status=completed&limit=1");
        if (!cancelled && done && !done.rating) setRequest(done);
      } catch {
        // restoring is best-effort; the dashboard still works without it
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isCustomer, user?.id]);

  // ---- real-time: the server pushes every status change ----
  useSocketEvent("request:update", (updated) => {
    setRequest((current) => (current && current._id === updated._id ? updated : current));
  });

  useSocketEvent("mechanic:location", (loc) => {
    setRequest((current) => {
      if (current && current._id === loc.requestId) setMechanicLocation({ lat: loc.lat, lng: loc.lng });
      return current;
    });
  });

  // toast whenever the status moves, so the driver notices even on another tab
  useEffect(() => {
    if (!request) {
      lastStatus.current = null;
      return;
    }
    if (lastStatus.current && lastStatus.current !== request.status) {
      const who = request.mechanic?.name?.split(" ")[0] ?? "Your mechanic";
      const msg = {
        matched: `${who} accepted your request`,
        on_the_way: `${who} is on the way`,
        arrived: `${who} has arrived`,
        in_progress: "Service has started",
        completed: "Service complete — please rate your mechanic",
        cancelled: "Request cancelled",
      }[request.status];
      if (msg) dispatch(pushNotification({ message: msg, tone: "success" }));
    }
    lastStatus.current = request.status;
  }, [request?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    if (!request) return;
    try {
      setRequest(await api.getRequest(request._id));
    } catch {
      // a transient failure shouldn't blow away what's on screen
    }
  }, [request]);

  // ---- useEffect: fallback polling, only while the socket is down ----
  useEffect(() => {
    if (!request || connected || FINISHED.includes(request.status)) return undefined;
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, [request?._id, request?.status, connected]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- useEffect: keep the tab title in sync with the active request ----
  useEffect(() => {
    document.title = request
      ? `RoadResQ — ${STEP_LABELS[request.status]}`
      : "RoadResQ — Real-Time Roadside Assistance";
  }, [request?.status, request]);

  async function startRequest({ problemType, location, vehicleId }) {
    setLoading(true);
    setError(null);
    try {
      const created = await api.createRequest({ problemType, location, vehicle: vehicleId || undefined });
      setRequest(created);
      setMechanicLocation(null);
      return created;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function cancelRequest() {
    if (!request) return;
    setError(null);
    try {
      setRequest(await api.cancelRequest(request._id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function rateRequest(rating, review) {
    const rated = await api.rateRequest(request._id, rating, review);
    setRequest(rated);
    dispatch(pushNotification({ message: "Thanks for your feedback!", tone: "success" }));
  }

  // clear a finished request off the dashboard so a new one can be made
  const dismissRequest = useCallback(() => {
    setRequest(null);
    setMechanicLocation(null);
  }, []);

  const value = {
    request,
    mechanicLocation,
    loading,
    error,
    startRequest,
    refresh,
    cancelRequest,
    rateRequest,
    dismissRequest,
    setRequest,
    setError,
  };

  return <RequestContext.Provider value={value}>{children}</RequestContext.Provider>;
}

export function useRequest() {
  const ctx = useContext(RequestContext);
  if (!ctx) throw new Error("useRequest must be used inside a <RequestProvider>");
  return ctx;
}
