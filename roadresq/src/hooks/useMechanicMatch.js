import { useEffect, useState } from "react";

/**
 * EXPERIMENT 2 — custom hook with an async effect + cleanup guard
 * -------------------------------------------------------------------
 * Re-runs the "nearest mechanic" matching algorithm whenever the
 * selected problem type changes. Scores every mechanic on distance,
 * rating, availability and specialisation match, then returns them
 * sorted best-first. The setTimeout stands in for a real API call —
 * the important part for the experiment is the `cancelled` flag,
 * which stops a slow/late response from calling setState after the
 * component has already unmounted or the input has already changed.
 */

const MECHANICS = [
  { name: "Vikram Rao", specialty: "battery", distanceKm: 0.7, rating: 4.9, available: true },
  { name: "Ayesha Khan", specialty: "puncture", distanceKm: 1.2, rating: 4.8, available: true },
  { name: "Suresh Patil", specialty: "engine", distanceKm: 2.1, rating: 4.7, available: true },
  { name: "Karan Mehta", specialty: "fuel", distanceKm: 3.8, rating: 4.5, available: true },
  { name: "Neha Joshi", specialty: "puncture", distanceKm: 0.9, rating: 4.6, available: false },
  { name: "Farhan Ali", specialty: "battery", distanceKm: 4.4, rating: 4.9, available: true },
];

function scoreOf(mechanic, problemType) {
  const distanceScore = Math.max(0, 1 - mechanic.distanceKm / 6); // closer = higher
  const ratingScore = mechanic.rating / 5;
  const specialtyScore = mechanic.specialty === problemType ? 1 : 0.3;
  const availabilityScore = mechanic.available ? 1 : 0;

  // weights: distance 35%, rating 25%, specialisation 25%, availability 15%
  return (
    distanceScore * 0.35 +
    ratingScore * 0.25 +
    specialtyScore * 0.25 +
    availabilityScore * 0.15
  );
}

export default function useMechanicMatch(problemType) {
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const id = setTimeout(() => {
      if (cancelled) return; // problemType changed again before this fired

      const ranked = MECHANICS.map((m) => ({
        ...m,
        score: scoreOf(m, problemType),
      })).sort((a, b) => b.score - a.score);

      setMechanics(ranked);
      setLoading(false);
    }, 450); // simulated network latency

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [problemType]);

  return { mechanics, loading };
}
