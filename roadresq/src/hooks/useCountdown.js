import { useEffect, useState } from "react";

/**
 * EXPERIMENT 2 — custom hook built on useEffect
 * ----------------------------------------------
 * Ticks a seconds value down to zero once per second. Any component
 * that needs a live countdown (ETA on the hero, ETA on the dashboard)
 * just calls useCountdown(seconds) instead of re-writing its own
 * setInterval/clearInterval logic.
 */
export default function useCountdown(initialSeconds, { loop = true } = {}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 0) return loop ? initialSeconds : 0;
        return prev - 1;
      });
    }, 1000);

    // cleanup — always clear the interval so it doesn't keep running
    // (or stack up duplicates) after the component unmounts
    return () => clearInterval(id);
  }, [initialSeconds, loop]);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return { secondsLeft, label: `${minutes}:${seconds}` };
}
