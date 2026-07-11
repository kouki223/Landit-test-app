import type { Spot, Bounds } from './types';

/** True when `inner` is fully contained within `outer`. */
export function isContained(inner: Bounds, outer: Bounds): boolean {
  return (
    inner.minLat >= outer.minLat &&
    inner.maxLat <= outer.maxLat &&
    inner.minLng >= outer.minLng &&
    inner.maxLng <= outer.maxLng
  );
}

/** True when a spot lies within the bounds. */
export function spotInBounds(s: Spot, b: Bounds): boolean {
  return (
    s.lat >= b.minLat &&
    s.lat <= b.maxLat &&
    s.lng >= b.minLng &&
    s.lng <= b.maxLng
  );
}

/** Client-side filter used when the new viewport is a subset of a cached region. */
export function filterSpots(spots: Spot[], b: Bounds): Spot[] {
  return spots.filter((s) => spotInBounds(s, b));
}

/**
 * A region fully fetched from the backend. Because the API applies no LIMIT,
 * `spots` is the complete set for `bounds`, so any sub-viewport can be served
 * by filtering locally instead of calling the API again.
 */
export interface CachedRegion {
  bounds: Bounds;
  spots: Spot[];
}
