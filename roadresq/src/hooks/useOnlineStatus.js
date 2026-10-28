import { useEffect, useState } from "react";

/**
 * EXPERIMENT 2 — custom hook wrapping a browser event with useEffect
 * --------------------------------------------------------------------
 * Subscribes to the browser's online/offline events once, and cleans
 * both listeners up on unmount. Any component (Navbar, Mechanic
 * dashboard) can call useOnlineStatus() to know the device's real
 * connectivity, separate from any "accepting jobs" toggle in the UI.
 */
export default function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
