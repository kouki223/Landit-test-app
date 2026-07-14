'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MapView from './MapView';
import SpotList from './SpotList';
import RadiusControl from './RadiusControl';
import AddressBar from './AddressBar';
import {
  fetchSpotsInBounds,
  fetchSpotsInRadius,
  reverseGeocode,
} from '@/lib/api';
import { debounce } from '@/lib/geo';
import { createAddressResolver } from '@/lib/address';
import {
  isContained,
  filterSpots,
  type CachedRegion,
} from '@/lib/viewportCache';
import type { Spot, LatLng, Bounds } from '@/lib/types';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

// 初期表示を日本全域に設定する
const JAPAN_BOUNDS: Bounds = { minLat: 24, minLng: 122, maxLat: 46, maxLng: 146 };

interface RadiusResult {
  center: LatLng;
  radiusKm: number;
}

export default function MapExplorer() {
  // 地図の現在位置
  const [center, setCenter] = useState<LatLng | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);

  // 表示するデータを管理する
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  
  // 半径検索モードの設定
  const [radiusKm, setRadiusKm] = useState(5);
  const [radiusResult, setRadiusResult] = useState<RadiusResult | null>(null);
  const [radiusMode, setRadiusMode] = useState(false);
  
  // ローディング関連の状態管理
  const [addressLoading, setAddressLoading] = useState(false);
  const [spotsLoading, setSpotsLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // radiusResultをrefにコピーして、debounced camera handlerで読み込めるようにする
  const radiusActiveRef = useRef(false);
  useEffect(() => {
    radiusActiveRef.current = radiusResult !== null;
  }, [radiusResult]);

// 直近に「完全取得」した領域。新しい表示範囲がこの中に収まるなら、
// API を再取得せずローカルの filter だけで一覧を作れる。
// 描画に使う値ではない（更新で再レンダリングは不要）ので useState ではなく useRef。
  const cacheRef = useRef<CachedRegion | null>(null);

  const fetchAndCache = useCallback((b: Bounds) => {
    setSpotsLoading(true);
    fetchSpotsInBounds(b)
      .then((res) => {
        cacheRef.current = { bounds: b, spots: res };
        setSpots(res);
      })
      .catch((err) => console.error('Failed to load spots in bounds', err))
      .finally(() => setSpotsLoading(false));
  }, []);

  const loadBounds = useRef(debounce(fetchAndCache, 400));

  // 表示範囲を更新する
  const applyViewport = useCallback(
    (b: Bounds) => {
      const cache = cacheRef.current;
      if (cache && isContained(b, cache.bounds)) {
        setSpots(filterSpots(cache.spots, b));
      } else {
        loadBounds.current(b);
      }
    },
    [],
  );

  // 逆ジオコーディングを行って住所を取得する
  const resolveAddress = useRef(
    createAddressResolver({
      fetchAddress: (c) => reverseGeocode(c).then((r) => r.address),
    }),
  );

  const handleCameraChange = useCallback((c: LatLng, b: Bounds | null) => {
    setCenter(c);
    setBounds(b);
    // 半径検索モードでは、リストは検索結果に固定されているので、表示範囲の更新はスキップする
    if (!radiusActiveRef.current && b) applyViewport(b);
    // 中心の住所を更新する
    setAddressLoading(true);
    resolveAddress
      .current(c)
      .then((res) => {
        if (res) setAddress(res.address);
      })
      .catch((err) => console.error('Reverse geocode failed', err))
      .finally(() => setAddressLoading(false));
  }, [applyViewport]);

  const handleSearch = useCallback(() => {
    if (!center) return;
    setRadiusResult({ center, radiusKm });
    setSelectedId(null);
    setSearching(true);
    fetchSpotsInRadius(center, radiusKm)
      .then(setSpots)
      .catch((err) => console.error('Radius search failed', err))
      .finally(() => setSearching(false));
  }, [center, radiusKm]);

  const resetToViewport = useCallback(() => {
    setRadiusResult(null);
    // 選択されたスポットをクリアする
    setSelectedId(null);
    if (bounds) fetchAndCache(bounds);
  }, [bounds, fetchAndCache]);

  const handleToggleRadius = useCallback(
    (on: boolean) => {
      setRadiusMode(on);
      if (!on) resetToViewport();
    },
    [resetToViewport],
  );

  if (!API_KEY) {
    return (
      <main className="flex h-full w-full items-center justify-center p-8 text-center">
        <div>
          <p className="text-lg font-semibold">Google Maps APIキーが未設定です</p>
          <p className="mt-2 text-sm text-gray-600">
            <code>.env</code> の{' '}
            <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> を設定してください。
          </p>
        </div>
      </main>
    );
  }

  // 半径検索モードの場合には、radiusResultを使用する
  const circle = radiusMode
    ? (radiusResult ?? (center ? { center, radiusKm } : null))
    : null;

  return (
    <main className="flex h-full w-full flex-col">
      <AddressBar address={address} loading={addressLoading} />
      <div className="flex min-h-0 flex-1">
        <aside className="w-80 shrink-0 overflow-hidden border-r bg-white">
          <SpotList
            spots={spots}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={spotsLoading || searching}
            title={
              radiusResult
                ? `半径${radiusResult.radiusKm}km以内のスポット`
                : '表示範囲のスポット'
            }
          />
        </aside>
        <div className="relative flex-1">
          <RadiusControl
            enabled={radiusMode}
            onToggle={handleToggleRadius}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
            onSearch={handleSearch}
            onClear={resetToViewport}
            active={radiusResult !== null}
            disabled={center === null}
            searching={searching}
          />
          <MapView
            apiKey={API_KEY}
            spots={spots}
            selectedId={selectedId}
            onSelect={setSelectedId}
            initialBounds={JAPAN_BOUNDS}
            circle={circle}
            onCameraChange={handleCameraChange}
          />
        </div>
      </div>
    </main>
  );
}
