// 逆ジオコーディングして、住所を取得する処理本体(サービス層)
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
小さな変更ではAPIを叩かないよう緯度と経度を受け取ってキーを生成する
 */
export function quantizeKey(lat: number, lng: number, decimals = 3): string {
  return `${lat.toFixed(decimals)},${lng.toFixed(decimals)}`;
}

@Injectable()
export class GeocodeService {
  private readonly logger = new Logger(GeocodeService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs = 1000 * 60 * 60 * 24; // 24時間キャッシュを有効にする
  // フロントでキーを管理したくないが、即時的なレスポンスを返すために必要(プロキシでコントロールする)
  private readonly apiKey = process.env.GOOGLE_GEOCODING_API_KEY || '';

  /** Promiseオブジェクトで緯度と経度を受け取ってキーを生成してキャッシュを管理する */
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

  /** もしも、API keyがダミーのままの場合には、フォールバックする*/
  private isRealKey(): boolean {
    return !!this.apiKey && !this.apiKey.startsWith('dummy');
  }

  private fallback(lat: number, lng: number): string {
    return `緯度${lat.toFixed(4)}, 経度${lng.toFixed(4)} 付近`;
  }

  private async fetchAddress(lat: number, lng: number): Promise<string> {
    // もし、keyがない場合にはフォールバックする
    if (!this.isRealKey()) {
      return this.fallback(lat, lng);
    }
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.set('latlng', `${lat},${lng}`); // 緯度と経度をキーにしてリクエスト
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
