// great-circle distance in km between two {lat, lng} points
export function haversineKm(a, b) {
  if (!a || !b || a.lat == null || b?.lat == null) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// rough ETA assuming ~30 km/h average urban speed; never less than 1 minute
export function etaMinutes(distanceKm, speedKmh = 30) {
  if (distanceKm == null) return null;
  return Math.max(1, Math.round((distanceKm / speedKmh) * 60));
}
