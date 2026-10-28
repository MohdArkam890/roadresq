import { useEffect, useState } from "react";

// Mumbai — used as a fallback so the app is still usable if location
// access is denied or unavailable (e.g. over plain HTTP)
export const FALLBACK_LOCATION = { lat: 19.076, lng: 72.8777 };

/**
 * Wraps the browser geolocation API in a hook so components can just
 * read { location, loading, error, isFallback } instead of dealing
 * with callbacks. `isFallback` lets callers avoid broadcasting a made-up
 * position (e.g. a mechanic's live tracking) as if it were real GPS.
 */
export default function useGeolocation() {
  const [location, setLocation] = useState(FALLBACK_LOCATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFallback, setIsFallback] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported — using a default location");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsFallback(false);
        setLoading(false);
      },
      () => {
        setError("Location access denied — using a default location");
        setLoading(false);
      },
      { timeout: 5000 }
    );
  }, []);

  return { location, loading, error, isFallback };
}
