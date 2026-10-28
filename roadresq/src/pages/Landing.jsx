import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BatteryWarning,
  CircleGauge,
  Fuel,
  Wrench,
  MapPin,
  Star,
  ArrowRight,
} from "lucide-react";
import HazardTicker from "../components/HazardTicker";
import RouteTracker from "../components/RouteTracker";
import useMechanicMatch from "../hooks/useMechanicMatch";

const problems = [
  { icon: CircleGauge, label: "Puncture", value: "puncture", note: "Flat tyre, blowout" },
  { icon: BatteryWarning, label: "Battery", value: "battery", note: "Jump start, replace" },
  { icon: Wrench, label: "Engine", value: "engine", note: "Won't start, stalling" },
  { icon: Fuel, label: "Fuel", value: "fuel", note: "Empty tank, wrong fuel" },
];

const steps = [
  {
    n: "01",
    title: "Report the breakdown",
    body: "Pick your problem type and share your live location — no forms, no hold music.",
  },
  {
    n: "02",
    title: "Get matched",
    body: "We rank nearby mechanics by distance, rating, availability and specialisation.",
  },
  {
    n: "03",
    title: "Track in real time",
    body: "Watch your mechanic's status update live over WebSockets, from accepted to arrived.",
  },
  {
    n: "04",
    title: "Resolve & rate",
    body: "Chat during the job, pay on completion, and rate the mechanic for the next driver.",
  },
];

export default function Landing() {
  const [selected, setSelected] = useState("battery");

  // custom hook — re-runs the distance/rating/specialisation/availability
  // matching algorithm every time `selected` changes (see the useEffect
  // dependency array inside useMechanicMatch)
  const { mechanics, loading } = useMechanicMatch(selected);
  const topThree = mechanics.slice(0, 3);

  return (
    <div>
      <HazardTicker />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20">
        <div className="grid gap-12 md:grid-cols-2 md:items-center md:gap-10">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-flare">
              Breakdown → Help, in minutes
            </p>
            <h1 className="mt-4 font-display text-6xl leading-[0.95] tracking-tight text-ink sm:text-7xl md:text-8xl">
              Stranded on
              <br />
              the road? <span className="text-flare">Not</span>
              <br />
              for long.
            </h1>
            <p className="mt-6 max-w-md font-body text-base text-ink/70">
              RoadResQ connects stranded drivers with the nearest verified
              mechanic — live location, live tracking, live status, no
              guesswork.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="flex items-center gap-2 rounded-sm bg-ink px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.1em] text-paper transition-transform hover:-translate-y-0.5"
              >
                Request assistance <ArrowRight size={16} />
              </Link>
              <Link
                to="/mechanic"
                className="flex items-center gap-2 rounded-sm border border-ink/20 px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.1em] text-ink transition-transform hover:-translate-y-0.5"
              >
                I'm a mechanic
              </Link>
            </div>

            <div className="mt-10 flex gap-8 border-t border-ink/10 pt-6">
              <div>
                <p className="font-display text-4xl text-ink">4,200+</p>
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink/50">
                  Breakdowns resolved
                </p>
              </div>
              <div>
                <p className="font-display text-4xl text-ink">6 min</p>
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink/50">
                  Avg. match time
                </p>
              </div>
              <div>
                <p className="font-display text-4xl text-ink">4.8★</p>
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink/50">
                  Mechanic rating
                </p>
              </div>
            </div>
          </div>

          <RouteTracker />
        </div>
      </section>

      {/* Problem selector */}
      <section className="border-t border-ink/10 bg-ink py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-amber">
                Step 01
              </p>
              <h2 className="mt-2 font-display text-4xl text-paper sm:text-5xl">
                What's wrong with your vehicle?
              </h2>
            </div>
            <p className="max-w-xs font-body text-sm text-paper/50">
              Tap a category — mechanics who specialise in it are prioritised
              in your match.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            {problems.map(({ icon: Icon, label, value, note }) => {
              const active = selected === value;
              return (
                <button
                  key={label}
                  onClick={() => setSelected(value)}
                  aria-pressed={active}
                  className={`group flex flex-col items-start gap-4 rounded-md border p-5 text-left transition-colors ${
                    active
                      ? "border-amber bg-amber/10"
                      : "border-ink-line hover:border-paper/30"
                  }`}
                >
                  <Icon
                    size={28}
                    strokeWidth={1.75}
                    className={active ? "text-amber" : "text-paper/70"}
                  />
                  <div>
                    <p className="font-display text-2xl text-paper">{label}</p>
                    <p className="font-body text-xs text-paper/45">{note}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-flare">
          The workflow
        </p>
        <h2 className="mt-2 max-w-xl font-display text-4xl text-ink sm:text-5xl">
          From flat tyre to fixed, tracked the whole way.
        </h2>

        <div className="mt-12 grid gap-px overflow-hidden rounded-md border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="bg-paper p-6">
              <p className="font-mono text-sm text-flare">{s.n}</p>
              <p className="mt-3 font-display text-2xl text-ink">{s.title}</p>
              <p className="mt-2 font-body text-sm text-ink/60">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Nearby mechanics preview */}
      <section className="border-t border-ink/10 bg-paper py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-flare">
                Nearest match for {problems.find((p) => p.value === selected)?.label}
              </p>
              <h2 className="mt-2 font-display text-4xl text-ink sm:text-5xl">
                Mechanics near you
              </h2>
            </div>
            <MapPin className="hidden text-ink/30 sm:block" size={40} strokeWidth={1.5} />
          </div>

          <div className="mt-10 divide-y divide-ink/10 rounded-md border border-ink/10 bg-white/40">
            {loading &&
              [0, 1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between p-5">
                  <div className="h-6 w-40 animate-pulse rounded bg-ink/10" />
                  <div className="h-8 w-20 animate-pulse rounded bg-ink/10" />
                </div>
              ))}

            {!loading &&
              topThree.map((m, i) => (
                <div
                  key={m.name}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    {i === 0 && (
                      <span className="rounded-full bg-amber/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber">
                        Best match
                      </span>
                    )}
                    <div>
                      <p className="font-display text-2xl text-ink">{m.name}</p>
                      <p className="font-body text-sm text-ink/50">
                        {m.specialty} · {m.available ? "Available" : "Busy"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-mono text-sm text-ink/60">{m.distanceKm} km</span>
                    <span className="flex items-center gap-1 font-mono text-sm text-ink/60">
                      <Star size={14} className="fill-amber text-amber" />
                      {m.rating}
                    </span>
                    <button className="rounded-sm bg-ink px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-paper">
                      Request
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-diagonal-hazard">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
          <div className="rounded-md bg-ink p-8 text-center md:p-14">
            <h2 className="font-display text-4xl text-paper sm:text-5xl">
              Don't wait by the roadside.
            </h2>
            <p className="mx-auto mt-3 max-w-md font-body text-sm text-paper/60">
              Create an account in under a minute and get matched with a
              nearby mechanic the moment you need one.
            </p>
            <Link
              to="/register"
              className="mt-7 inline-flex items-center gap-2 rounded-sm bg-flare px-7 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.1em] text-paper"
            >
              Create free account <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
