import { useEffect, useState } from "react";

/**
 * EXPERIMENT 2 — custom hook, counts up instead of down
 * --------------------------------------------------------
 * While `active` is true, ticks a seconds counter up once a second.
 * Resets to 0 whenever `active` flips back to true after being false.
 * Used for the mechanic's "online for HH:MM" shift timer.
 */
export default function useElapsedTime(active) {
  const [seconds, setSeconds] = useState(0);

  // reset the clock whenever the mechanic goes online again
  useEffect(() => {
    if (active) setSeconds(0);
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const id = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(id);
  }, [active]);

  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");

  return { seconds, label: `${h}:${m}:${s}` };
}
