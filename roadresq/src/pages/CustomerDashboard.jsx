import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Car, Clock, MessageSquare, Star, Plus, X, Trash2, AlertCircle, Radio, WifiOff } from "lucide-react";
import RouteTracker from "../components/RouteTracker";
import ChatPanel from "../components/ChatPanel";
import RatingForm from "../components/RatingForm";
import { useSocket } from "../context/SocketContext";
import { haversineKm, etaMinutes } from "../utils/geo";
import { useRequest, REQUEST_STEPS, STEP_LABELS } from "../context/RequestContext";
import { useAuth } from "../context/AuthContext";
import useGeolocation from "../hooks/useGeolocation";
import {
  selectVehicles,
  selectVehiclesStatus,
  fetchVehicles,
  addVehicle,
  removeVehicle,
} from "../store/vehiclesSlice";
import { pushNotification } from "../store/notificationsSlice";
import api from "../lib/api";

const tabs = ["Active request", "My vehicles", "History"];
const PROBLEM_OPTIONS = ["puncture", "battery", "engine", "fuel", "towing"];

function AddVehicleForm({ onClose }) {
  const dispatch = useDispatch();
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [type, setType] = useState("Hatchback");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !plate.trim()) return;
    setSubmitting(true);
    try {
      await dispatch(addVehicle({ name, plate, type })).unwrap();
      dispatch(pushNotification({ message: `${name} added to your garage`, tone: "success" }));
      onClose();
    } catch (err) {
      dispatch(pushNotification({ message: err.message || "Could not add vehicle" }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-md border border-dashed border-ink/20 p-5 sm:col-span-2"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Vehicle name"
          className="rounded-sm border border-ink/15 bg-white px-3 py-2 font-body text-sm text-ink placeholder:text-ink/30"
        />
        <input
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          placeholder="Plate number"
          className="rounded-sm border border-ink/15 bg-white px-3 py-2 font-body text-sm text-ink placeholder:text-ink/30"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-sm border border-ink/15 bg-white px-3 py-2 font-body text-sm text-ink"
        >
          <option>Hatchback</option>
          <option>Sedan</option>
          <option>SUV</option>
          <option>Motorcycle</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-sm bg-ink px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-paper disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save vehicle"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] text-ink/50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function NewRequestPicker({ onClose, vehicles }) {
  const [problemType, setProblemType] = useState("battery");
  const [vehicleId, setVehicleId] = useState(vehicles[0]?._id || "");
  const [preview, setPreview] = useState({ loading: true, mechanics: [] });
  const { location } = useGeolocation();
  const { startRequest } = useRequest();
  const dispatch = useDispatch();
  const [submitting, setSubmitting] = useState(false);

  // preview the best-ranked mechanic for the chosen problem type before confirming
  useEffect(() => {
    let cancelled = false;
    setPreview((p) => ({ ...p, loading: true }));
    api
      .nearbyMechanics(problemType, location.lat, location.lng)
      .then((mechanics) => !cancelled && setPreview({ loading: false, mechanics }))
      .catch(() => !cancelled && setPreview({ loading: false, mechanics: [] }));
    return () => {
      cancelled = true;
    };
  }, [problemType, location]);

  const best = preview.mechanics[0];

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await startRequest({ problemType, location, vehicleId });
      onClose();
    } catch (err) {
      dispatch(pushNotification({ message: err.message || "Could not create request" }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border border-ink/10 bg-white/60 p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/40">
          What's wrong?
        </p>
        <button onClick={onClose} className="text-ink/40 hover:text-ink">
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {PROBLEM_OPTIONS.map((p) => (
          <button
            key={p}
            onClick={() => setProblemType(p)}
            className={`rounded-full border px-3.5 py-1.5 font-mono text-xs uppercase tracking-wide ${
              problemType === p ? "border-flare bg-flare/10 text-flare" : "border-ink/15 text-ink/50"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {vehicles.length > 0 && (
        <select
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          className="mt-3 w-full rounded-sm border border-ink/15 bg-white px-3 py-2 font-body text-sm text-ink"
        >
          {vehicles.map((v) => (
            <option key={v._id} value={v._id}>
              {v.name} · {v.plate}
            </option>
          ))}
        </select>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-4">
        {preview.loading ? (
          <p className="font-body text-sm text-ink/40">Finding the best match…</p>
        ) : best ? (
          <p className="font-body text-sm text-ink/60">
            Best match: <span className="font-semibold text-ink">{best.name}</span> ·{" "}
            {best.distanceKm ?? "—"} km away
          </p>
        ) : (
          <p className="font-body text-sm text-ink/40">No mechanics available right now.</p>
        )}
        <button
          disabled={preview.loading || submitting || !best}
          onClick={handleConfirm}
          className="rounded-sm bg-flare px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-paper disabled:opacity-40"
        >
          {submitting ? "Requesting…" : "Confirm request"}
        </button>
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  const [tab, setTab] = useState(tabs[0]);
  const [picking, setPicking] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const { user } = useAuth();
  const { connected } = useSocket();
  const {
    request,
    mechanicLocation,
    cancelRequest,
    rateRequest,
    dismissRequest,
    error: requestError,
  } = useRequest();

  const dispatch = useDispatch();
  const vehicles = useSelector(selectVehicles);
  const vehiclesStatus = useSelector(selectVehiclesStatus);

  useEffect(() => {
    dispatch(fetchVehicles());
  }, [dispatch]);

  const stepIndex = request ? REQUEST_STEPS.indexOf(request.status) : -1;
  const activeSteps = REQUEST_STEPS.filter((s) => s !== "cancelled");

  // distance + ETA: prefer the mechanic's live position, else their last known one
  const mechanicPos = mechanicLocation || request?.mechanic?.location;
  const distanceKm = request && mechanicPos?.lat != null ? haversineKm(mechanicPos, request.location) : null;
  const canCancel = request && ["requested", "matched", "on_the_way", "arrived"].includes(request.status);
  const chatAvailable = request && request.mechanic && request.status !== "requested";

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-flare">
            Driver dashboard
          </p>
          <h1 className="mt-1 font-display text-4xl text-ink sm:text-5xl">
            Hey {user?.name?.split(" ")[0] || "there"}, stay safe out there.
          </h1>
        </div>
        {!request && (
          <button
            onClick={() => setPicking((v) => !v)}
            className="mt-4 flex items-center gap-2 self-start rounded-sm bg-ink px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-paper sm:mt-0"
          >
            <Plus size={15} /> New request
          </button>
        )}
      </div>

      {picking && !request && (
        <div className="mt-6">
          <NewRequestPicker onClose={() => setPicking(false)} vehicles={vehicles} />
        </div>
      )}

      <div className="mt-8 flex gap-1 border-b border-ink/10">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 font-mono text-xs uppercase tracking-[0.15em] transition-colors ${
              tab === t ? "border-b-2 border-flare text-ink" : "text-ink/40 hover:text-ink/70"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "Active request" && (
          <>
            {requestError && (
              <div className="mb-4 flex items-center gap-2 rounded-sm border border-flare/40 bg-flare/10 px-4 py-3 font-body text-sm text-flare">
                <AlertCircle size={16} /> {requestError}
              </div>
            )}
            {!request ? (
              <div className="rounded-md border border-dashed border-ink/20 p-10 text-center">
                <p className="font-display text-2xl text-ink">No active request</p>
                <p className="mt-1 font-body text-sm text-ink/50">
                  Tap "New request" above and we'll match you with the nearest available mechanic.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
                {request.status === "cancelled" ? (
                  <div className="rounded-md border border-flare/30 bg-flare/5 p-8 text-center md:col-span-2">
                    <p className="font-display text-2xl text-ink">Request cancelled</p>
                    <p className="mt-1 font-body text-sm text-ink/50">
                      You can start a new request any time.
                    </p>
                    <button
                      onClick={dismissRequest}
                      className="mt-4 rounded-sm bg-ink px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-paper"
                    >
                      Start a new request
                    </button>
                  </div>
                ) : request.status === "completed" ? (
                  <div className="md:col-span-2">
                    {request.rating ? (
                      <div className="rounded-md border border-signal/30 bg-signal/5 p-8 text-center">
                        <p className="font-display text-2xl text-ink">All done — thanks for rating!</p>
                        <div className="mt-2 flex justify-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} size={18} className={n <= request.rating ? "fill-amber text-amber" : "text-ink/15"} />
                          ))}
                        </div>
                        <p className="mt-2 font-body text-sm text-ink/50">Total fare ₹{request.fare}</p>
                        <button
                          onClick={dismissRequest}
                          className="mt-4 rounded-sm bg-ink px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-paper"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <RatingForm
                        mechanicName={request.mechanic?.name?.split(" ")[0]}
                        onSubmit={rateRequest}
                        onSkip={dismissRequest}
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <RouteTracker
                      mechanicName={request.mechanic?.name?.split(" ")[0] ?? "Mechanic"}
                      specialty={request.mechanic?.specialty ?? request.problemType}
                      distance={
                        !request.mechanic
                          ? "waiting for a match"
                          : distanceKm != null
                          ? `${distanceKm.toFixed(1)} km away`
                          : "nearby"
                      }
                      etaMinutes={distanceKm != null ? etaMinutes(distanceKm) : null}
                      status={request.status}
                    />
                    <div className="flex flex-col gap-4">
                      <div className="rounded-md border border-ink/10 bg-white/50 p-5">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/40">
                          Request status
                        </p>
                        <div className="mt-4 flex flex-col gap-3">
                          {activeSteps.map((step, i) => (
                            <div key={step} className="flex items-center gap-3">
                              <span
                                className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[10px] ${
                                  i < stepIndex
                                    ? "bg-signal text-ink"
                                    : i === stepIndex
                                    ? "border-2 border-flare text-flare"
                                    : "border border-ink/20 text-ink/30"
                                }`}
                              >
                                {i < stepIndex ? "✓" : i + 1}
                              </span>
                              <span className={`font-body text-sm ${i <= stepIndex ? "text-ink" : "text-ink/40"}`}>
                                {STEP_LABELS[step]}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p
                          className={`mt-4 flex items-center gap-1.5 border-t border-ink/10 pt-3 font-body text-xs ${
                            connected ? "text-signal" : "text-ink/40"
                          }`}
                        >
                          {connected ? <Radio size={12} /> : <WifiOff size={12} />}
                          {connected ? "Live — updates arrive instantly" : "Reconnecting — checking every few seconds"}
                        </p>
                        {request.status === "requested" && (
                          <p className="mt-2 font-body text-xs text-ink/50">
                            No mechanic is free right now. Stay on this screen or cancel and try again shortly.
                          </p>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setChatOpen((v) => !v)}
                          disabled={!chatAvailable}
                          aria-expanded={chatOpen}
                          className="flex flex-1 items-center justify-center gap-2 rounded-sm border border-ink/15 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-ink disabled:opacity-40"
                        >
                          <MessageSquare size={15} /> Chat
                        </button>
                        {canCancel && (
                          <button
                            onClick={cancelRequest}
                            className="rounded-sm border border-flare/40 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-flare"
                          >
                            Cancel
                          </button>
                        )}
                      </div>

                      {chatOpen && chatAvailable && (
                        <ChatPanel
                          requestId={request._id}
                          myId={user?.id}
                          title={`Chat with ${request.mechanic?.name?.split(" ")[0] ?? "mechanic"}`}
                          onClose={() => setChatOpen(false)}
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {tab === "My vehicles" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {vehiclesStatus === "loading" && (
              <p className="font-body text-sm text-ink/40">Loading your vehicles…</p>
            )}
            {vehicles.map((v) => (
              <div key={v._id} className="group flex items-start gap-4 rounded-md border border-ink/10 bg-white/50 p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-ink text-amber">
                  <Car size={20} />
                </span>
                <div className="flex-1">
                  <p className="font-display text-2xl text-ink">{v.name}</p>
                  <p className="font-mono text-xs text-ink/50">{v.plate}</p>
                  <p className="mt-1 font-body text-xs text-ink/40">{v.type}</p>
                </div>
                <button
                  onClick={() => dispatch(removeVehicle(v._id))}
                  aria-label={`Remove ${v.name}`}
                  className="text-ink/20 opacity-0 transition-opacity hover:text-flare group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {addingVehicle ? (
              <AddVehicleForm onClose={() => setAddingVehicle(false)} />
            ) : (
              <button
                onClick={() => setAddingVehicle(true)}
                className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-ink/20 p-5 text-ink/40 hover:border-ink/40 hover:text-ink/60"
              >
                <Plus size={20} />
                <span className="font-mono text-xs uppercase tracking-[0.15em]">Add vehicle</span>
              </button>
            )}
          </div>
        )}

        {tab === "History" && <RequestHistory />}
      </div>
    </div>
  );
}

function RequestHistory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listRequests("?limit=20")
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="font-body text-sm text-ink/40">Loading history…</p>;
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-ink/15 p-6 text-center font-body text-sm text-ink/40">
        No past requests yet.
      </p>
    );
  }

  return (
    <div className="divide-y divide-ink/10 rounded-md border border-ink/10 bg-white/50">
      {items.map((h) => (
        <div key={h._id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Clock size={16} className="text-ink/30" />
            <div>
              <p className="font-display text-xl capitalize text-ink">{h.problemType}</p>
              <p className="font-body text-xs text-ink/45">
                {new Date(h.createdAt).toLocaleDateString()} · {h.mechanic?.name ?? "Unassigned"} ·{" "}
                <span className="capitalize">{h.status}</span>
              </p>
            </div>
          </div>
          {h.rating && (
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} className={i < h.rating ? "fill-amber text-amber" : "text-ink/15"} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
