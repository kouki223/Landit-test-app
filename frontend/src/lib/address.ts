import { distanceMeters } from './geo';
import type { LatLng } from './types';

export type ResolveSource = 'cache' | 'fetch';

export interface AddressResolution {
  address: string;
  source: ResolveSource;
}

export interface AddressResolverOptions {
  /** Performs the actual reverse geocode for a coordinate. */
  fetchAddress: (c: LatLng) => Promise<string>;
  /** Skip resolving if the centre moved less than this many metres. */
  minMoveMeters?: number;
  /** Grid precision for the cache key (3 ≈ 110m cells). */
  decimals?: number;
}

/**
 * Builds a reverse-geocode resolver that avoids unnecessary API calls by:
 *  1. skipping tiny movements (below minMoveMeters),
 *  2. quantising coordinates into grid cells and caching per cell.
 * Returns null when the call is skipped.
 */
export function createAddressResolver({
  fetchAddress,
  minMoveMeters = 50,
  decimals = 3,
}: AddressResolverOptions) {
  const cache = new Map<string, string>();
  let lastCenter: LatLng | null = null;

  return async function resolve(
    center: LatLng,
  ): Promise<AddressResolution | null> {
    if (lastCenter && distanceMeters(center, lastCenter) < minMoveMeters) {
      return null; // moved too little — reuse whatever is on screen
    }
    lastCenter = center;

    const key = `${center.lat.toFixed(decimals)},${center.lng.toFixed(decimals)}`;
    const cached = cache.get(key);
    if (cached != null) {
      return { address: cached, source: 'cache' };
    }

    const address = await fetchAddress(center);
    cache.set(key, address);
    return { address, source: 'fetch' };
  };
}
