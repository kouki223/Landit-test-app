import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry {
  address: string;
  expiresAt: number;
}

export interface ReverseGeocodeResult {
  address: string;
  cached: boolean;
}

/**
 * Quantise coordinates into a grid cell key so that tiny map movements resolve
 * to the same cache entry (~110m at 3 decimals). This is the core of the
 * "don't hit the API on small moves" optimisation.
 */
export function quantizeKey(lat: number, lng: number, decimals = 3): string {
  return `${lat.toFixed(decimals)},${lng.toFixed(decimals)}`;
}

@Injectable()
export class GeocodeService {
  private readonly logger = new Logger(GeocodeService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs = 1000 * 60 * 60 * 24; // 24h: addresses are effectively static
  private readonly apiKey = process.env.GOOGLE_GEOCODING_API_KEY || '';

  /** Reverse-geocode a coordinate, using a shared server-side cache. */
  async reverse(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    const key = quantizeKey(lat, lng);
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) {
      return { address: hit.address, cached: true };
    }
    const address = await this.fetchAddress(lat, lng);
    this.cache.set(key, { address, expiresAt: now + this.ttlMs });
    return { address, cached: false };
  }

  /** A real key is anything not empty and not the documented dummy placeholder. */
  private isRealKey(): boolean {
    return !!this.apiKey && !this.apiKey.startsWith('dummy');
  }

  private fallback(lat: number, lng: number): string {
    return `緯度${lat.toFixed(4)}, 経度${lng.toFixed(4)} 付近`;
  }

  private async fetchAddress(lat: number, lng: number): Promise<string> {
    // Without a real key the app still works, returning a readable coordinate label.
    if (!this.isRealKey()) {
      return this.fallback(lat, lng);
    }
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.set('latlng', `${lat},${lng}`);
      url.searchParams.set('language', 'ja');
      url.searchParams.set('key', this.apiKey);

      const res = await fetch(url);
      const data: any = await res.json();
      if (data.status === 'OK' && data.results?.length) {
        return data.results[0].formatted_address as string;
      }
      this.logger.warn(`Geocoding returned status=${data.status}`);
      return this.fallback(lat, lng);
    } catch (err) {
      this.logger.error(`Geocoding request failed: ${String(err)}`);
      return this.fallback(lat, lng);
    }
  }
}
