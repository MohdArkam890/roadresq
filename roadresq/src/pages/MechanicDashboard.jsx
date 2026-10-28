import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  MapPin, Star, Wallet, CheckCircle2, WifiOff, AlertCircle, MessageSquare, Navigation, Phone, Radio,
} from "lucide-react";
import useOnlineStatus from "../hooks/useOnlineStatus";
import useElapsedTime from "../hooks/useElapsedTime";
import useGeolocation from "../hooks/useGeolocation";
import useSocketEvent from "../hooks/useSocketEvent";
import useLiveLocationSharing from "../hooks/useLiveLocationSharing";
import ChatPanel from "../components/ChatPanel";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { timeAgo } from "../utils/date";
import {
  selectPendingRequests,
  selectActiveRequests,
  selectCompletedToday,
  selectEarningsToday,
  selectQueueStatus,
  fetchAssignedRequests,
  acceptRequest,
  advanceRequest,
  declineRequest,
  upsertRequest,
  removeRequest,
} from "../store/mechanicQueueSlice";
import { pushNotification } from "../store/notificationsSlice";
import api from "../lib/api";

// what the mechanic can do next, per status
const NEXT_STEP = {
  on_the_way: { status: "arrived", label: "I've arrived" },
  arrived: { status: "in_progress", label: "Start service" },
  in_progress: { status: "completed", label: "Complete job" },
};

function ActiveJob({ job, myId, onAdvance, busy }) {
  const [chatOpen, setChatOpen] = useState(false);
  const next = NEXT_STEP[job.status];

  return (
    <div className="rounded-md border border-signal/30 bg-signal/5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-xl text-ink">{job.customer?.name}</p>
          <p className="font-body text-xs capitalize text-ink/50">
            {job.problemType}
            {job.vehicle ? ` · ${job.vehicle.name} (${job.vehicle.plate})` : ""} ·{" "}
            <span className="text-signal">{job.status.replace(/_/g, " ")}</span> · ₹{job.fare}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-[0.1em]">
            <a
              href={`https://www.google.com/maps?q=${job.location.lat},${job.location.lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-flare"
            >
              <Navigation size={12} /> Navigate
            </a>
            {job.customer?.phone && (
              <a href={`tel:${job.customer.phone}`} className="flex items-center gap-1 text-ink/60">
                <Phone size={12} /> {job.customer.phone}
              </a>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setChatOpen((v) => !v)}
            aria-expanded={chatOpen}
            className="flex items-center gap-1.5 rounded-sm border border-ink/15 px-3 py-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink"
          >
            <MessageSquare size={14} /> Chat
          </button>
          {next && (
            <button
              onClick={() => onAdvance(job, next.status)}
              disabled={busy}
              className="rounded-sm bg-signal px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink disabled:opacity-50"
            >
              {next.label}
            </button>
          )}
        </div>
      </div>

      {chatOpen && (
        <div className="mt-4">
          <ChatPanel
            requestId={job._id}
            myId={myId}
            title={`Chat with ${job.customer?.name?.split(" ")[0] ?? "customer"}`}
            onClose={() => setChatOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

export default function MechanicDashboard() {
  const { user } = useAuth();
  const { connected } = useSocket();
  const [profile, setProfile] = useState(user);
  const [acceptingJobs, setAcceptingJobs] = useState(user?.available ?? true);
  const [availabilityError, setAvailabilityError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const isDeviceOnline = useOnlineStatus();
  const { label: shiftTime } = useElapsedTime(acceptingJobs);
  const { location, isFallback } = useGeolocation();

  const dispatch = useDispatch();
  const pending = useSelector(selectPendingRequests);
  const active = useSelector(selectActiveRequests);
  const queueStatus = useSelector(selectQueueStatus);
  const completedToday = useSelector(selectCompletedToday);
  const earningsToday = useSelector(selectEarningsToday);

  // initial load + fresh profile (rating / availability may have changed since login)
  useEffect(() => {
    dispatch(fetchAssignedRequests());
    api
      .me()
      .then(({ user: fresh }) => {
        setProfile(fresh);
        setAcceptingJobs(fresh.available);
      })
      .catch(() => {});
  }, [dispatch]);

  // a real GPS fix updates the mechanic's stored position so matching uses it
  // (the Mumbai fallback is never uploaded)
  useEffect(() => {
    if (isFallback) return;
    api.setAvailability({ available: acceptingJobs, location }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFallback]);

  // ---- EXPERIMENT 8: live events replace polling ----
  useSocketEvent("request:new", (req) => {
    dispatch(upsertRequest(req));
    dispatch(pushNotification({ message: `New ${req.problemType} request from ${req.customer?.name}`, tone: "success" }));
  });
  useSocketEvent("request:update", (req) => dispatch(upsertRequest(req)));
  useSocketEvent("request:removed", ({ id }) => dispatch(removeRequest(id)));

  // fallback: only poll while the socket is down
  useEffect(() => {
    if (connected) return undefined;
    const id = setInterval(() => dispatch(fetchAssignedRequests()), 8000);
    return () => clearInterval(id);
  }, [connected, dispatch]);

  // stream GPS to the customer for the job that's currently en route
  const enRoute = active.find((r) => r.status === "on_the_way");
  useLiveLocationSharing({
    requestId: enRoute?._id,
    enabled: Boolean(enRoute),
    location,
    isFallback,
  });

  async function toggleAccepting() {
    const next = !acceptingJobs;
    setAcceptingJobs(next);
    setAvailabilityError(null);
    try {
      await api.setAvailability({ available: next, ...(isFallback ? {} : { location }) });
    } catch (err) {
      setAvailabilityError(err.message);
      setAcceptingJobs(!next); // revert on failure
    }
  }

  async function handleAccept(req) {
    try {
      await dispatch(acceptRequest(req._id)).unwrap();
      dispatch(pushNotification({ message: `Accepted ${req.customer?.name}'s job`, tone: "success" }));
    } catch (err) {
      dispatch(pushNotification({ message: err.message || "Could not accept" }));
    }
  }

  async function handleDecline(req) {
    try {
      await dispatch(declineRequest(req._id)).unwrap();
      dispatch(pushNotification({ message: `Declined ${req.customer?.name}'s request` }));
    } catch (err) {
      dispatch(pushNotification({ message: err.message || "Could not decline" }));
    }
  }

  async function handleAdvance(job, status) {
    setBusyId(job._id);
    try {
      await dispatch(advanceRequest({ id: job._id, status })).unwrap();
      if (status === "completed") {
        dispatch(pushNotification({ message: `Job complete — ₹${job.fare} earned`, tone: "success" }));
      }
    } catch (err) {
      dispatch(pushNotification({ message: err.message || "Could not update job" }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
      {!isDeviceOnline && (
        <div className="mb-6 flex items-center gap-2 rounded-sm border border-flare/40 bg-flare/10 px-4 py-2.5 font-mono text-xs uppercase tracking-wide text-flare">
          <WifiOff size={14} /> Device offline — new requests won't come through
        </div>
      )}
      {availabilityError && (
        <div className="mb-6 flex items-center gap-2 rounded-sm border border-flare/40 bg-flare/10 px-4 py-2.5 font-body text-sm text-flare">
          <AlertCircle size={14} /> {availabilityError}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-flare">Mechanic dashboard</p>
          <h1 className="mt-1 font-display text-4xl text-ink sm:text-5xl">{user?.name || "Mechanic"}</h1>
          <p className="mt-1 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.15em] text-ink/40">
            {acceptingJobs && <span>Online for {shiftTime}</span>}
            <span className={`flex items-center gap-1 ${connected ? "text-signal" : "text-flare"}`}>
              <Radio size={11} /> {connected ? "live" : "reconnecting"}
            </span>
          </p>
        </div>

        <button
          onClick={toggleAccepting}
          className={`flex items-center gap-3 rounded-sm border px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] transition-colors ${
            acceptingJobs ? "border-signal bg-signal/10 text-signal" : "border-ink/20 text-ink/40"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${acceptingJobs ? "animate-blink bg-signal" : "bg-ink/30"}`} />
          {acceptingJobs ? "Online — accepting jobs" : "Offline"}
        </button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Pending requests", value: pending.length, icon: MapPin },
          { label: "Completed today", value: completedToday, icon: CheckCircle2 },
          { label: "Rating", value: profile?.rating?.toFixed(1) ?? "4.5", icon: Star },
          { label: "Today's earnings", value: `₹${earningsToday.toLocaleString("en-IN")}`, icon: Wallet },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-md border border-ink/10 bg-white/50 p-4">
            <Icon size={18} className="text-flare" />
            <p className="mt-3 font-display text-3xl text-ink">{value}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink/40">{label}</p>
          </div>
        ))}
      </div>

      {active.length > 0 && (
        <div className="mt-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/40">In progress</p>
          <div className="mt-4 flex flex-col gap-3">
            {active.map((r) => (
              <ActiveJob key={r._id} job={r} myId={user?.id} onAdvance={handleAdvance} busy={busyId === r._id} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/40">Nearby requests</p>

        <div className="mt-4 flex flex-col gap-3">
          {pending.length === 0 && (
            <p className="rounded-md border border-dashed border-ink/15 p-6 text-center font-body text-sm text-ink/40">
              {queueStatus === "loading" ? "Loading…" : "No pending requests right now."}
            </p>
          )}

          {pending.map((r) => (
            <div
              key={r._id}
              className="flex flex-col gap-4 rounded-md border border-ink/10 bg-white/50 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink font-display text-lg text-amber">
                  {r.customer?.name?.[0] ?? "?"}
                </span>
                <div>
                  <p className="font-display text-xl text-ink">{r.customer?.name}</p>
                  <p className="font-body text-xs capitalize text-ink/45">
                    {r.problemType} · {timeAgo(r.createdAt)} · ₹{r.fare}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDecline(r)}
                  className="rounded-sm border border-ink/15 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-ink/60"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAccept(r)}
                  className="rounded-sm bg-flare px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-paper"
                >
                  Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
