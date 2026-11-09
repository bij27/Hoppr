export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_M = 6_371_000;
/** Average walking pace (~4.8 km/h). */
const WALK_METERS_PER_MIN = 80;
/** Streets aren't straight lines; scales crow-flies distance to approximate street distance. */
const STREET_DETOUR_FACTOR = 1.3;

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Estimated walking time in whole minutes (rounded up).
 * Placeholder until we call a real routing API (Mapbox Directions) for crawl legs.
 */
export function walkMinutes(a: LatLng, b: LatLng): number {
  const meters = distanceMeters(a, b);
  if (meters === 0) return 0;
  return Math.ceil((meters * STREET_DETOUR_FACTOR) / WALK_METERS_PER_MIN);
}

export function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  if (miles < 0.1) return `${Math.round(meters * 3.28084)} ft`;
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
}
