import type { Spot, Bounds, LatLng } from './types';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${url}`);
  }
  return res.json() as Promise<T>;
}

/** All spots (used as an initial nationwide view fallback). */
export function fetchAllSpots(): Promise<Spot[]> {
  return getJson<Spot[]>(`${BASE}/spots`);
}

/** Spots inside the current map viewport (bounding box). */
export function fetchSpotsInBounds(b: Bounds): Promise<Spot[]> {
  const q = new URLSearchParams({
    minLat: String(b.minLat),
    minLng: String(b.minLng),
    maxLat: String(b.maxLat),
    maxLng: String(b.maxLng),
  });
  return getJson<Spot[]>(`${BASE}/spots?${q.toString()}`);
}

/** Spots within `radiusKm` of a centre point (radius search). */
export function fetchSpotsInRadius(c: LatLng, radiusKm: number): Promise<Spot[]> {
  const q = new URLSearchParams({
    lat: String(c.lat),
    lng: String(c.lng),
    radius: String(radiusKm),
  });
  return getJson<Spot[]>(`${BASE}/spots?${q.toString()}`);
}

export interface ReverseGeocodeResponse {
  address: string;
  cached: boolean;
}

/** Reverse-geocode a coordinate via the backend proxy. */
export function reverseGeocode(c: LatLng): Promise<ReverseGeocodeResponse> {
  const q = new URLSearchParams({ lat: String(c.lat), lng: String(c.lng) });
  return getJson<ReverseGeocodeResponse>(`${BASE}/geocode/reverse?${q.toString()}`);
}
