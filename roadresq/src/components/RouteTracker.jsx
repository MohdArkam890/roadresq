import { useEffect, useRef, useState } from "react";
import useCountdown from "../hooks/useCountdown";
import { STEP_LABELS } from "../context/RequestContext";

/**
 * Live tracking card. When the server is relaying the mechanic's real
 * position (`distanceKm` / `etaMinutes` supplied) it shows those; before
 * that — or if GPS isn't available — it falls back to the countdown hook
 * from Experiment 2 so the card is never empty.
 */
export default function RouteTracker({
  mechanicName = "Vikram",
  specialty = "Battery & Towing",
  distance = "0.7 km away",
  status = "on_the_way",
  etaMinutes = null,
}) {
  const { label } = useCountdown(11 * 60 + 42);
  const pathRef = useRef(null);
  const [dot, setDot] = useState(null);
  const arrived = ["arrived", "in_progress", "completed"].includes(status);

  // progress of the dashed route: the mechanic's dot moves as status advances
  const progress = { requested: 0, matched: 0.05, on_the_way: 0.5, arrived: 1, in_progress: 1, completed: 1 }[status] ?? 0;

  // place the mechanic's dot along the route path (guarded: jsdom has no SVG geometry)
  useEffect(() => {
    const path = pathRef.current;
    if (!path || typeof path.getPointAtLength !== "function" || progress === 0) return setDot(null);
    const pt = path.getPointAtLength(path.getTotalLength() * progress);
    setDot({ x: pt.x, y: pt.y });
  }, [progress]);

  return (
    <div className="relative rounded-md border border-ink-line bg-ink-soft p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/50">Live tracking</span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
          <span className="h-1.5 w-1.5 animate-blink rounded-full bg-signal" />
          {STEP_LABELS[status] ?? "En route"}
        </span>
      </div>

      <svg viewBox="0 0 320 120" className="w-full" role="img" aria-label="Mechanic route to your location">
        <path ref={pathRef} d="M 24 92 C 90 92, 90 30, 160 30 S 260 92, 296 28" fill="none" stroke="#2A2E38" strokeWidth="3" />
        <path
          d="M 24 92 C 90 92, 90 30, 160 30 S 260 92, 296 28"
          fill="none"
          stroke="#F5A623"
          strokeWidth="3"
          strokeDasharray="10 8"
          strokeDashoffset="180"
          className="animate-dash"
        />
        <circle cx="24" cy="92" r="6" fill="#F5F3EC" />
        <circle cx="296" cy="28" r="6" fill="#FF5A36" />
        <text x="14" y="112" className="font-mono" fontSize="9" fill="#F5F3EC" opacity="0.6">MECHANIC</text>
        <text x="270" y="18" className="font-mono" fontSize="9" fill="#FF5A36" opacity="0.9">YOU</text>
        {dot && <circle cx={dot.x} cy={dot.y} r="7" fill="#33C481" stroke="#14161B" strokeWidth="2" />}
      </svg>

      <div className="mt-4 flex items-end justify-between border-t border-ink-line pt-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/50">
            {mechanicName} · {specialty}
          </p>
          <p className="font-display text-2xl text-paper">{arrived ? "On site" : distance}</p>
        </div>
        <p className="font-mono text-2xl font-medium text-amber">
          {arrived ? "✓" : etaMinutes != null ? `~${etaMinutes} min` : label}
        </p>
      </div>
    </div>
  );
}
