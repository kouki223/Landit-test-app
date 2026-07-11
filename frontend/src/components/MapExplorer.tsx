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

// Padded bounding box covering the whole spot dataset (all of Japan).
const JAPAN_BOUNDS: Bounds = { minLat: 24, minLng: 122, maxLat: 46, maxLng: 146 };

interface RadiusResult {
  center: LatLng;
  radiusKm: number;
}

export default function MapExplorer() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [center, setCenter] = useState<LatLng | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [radiusResult, setRadiusResult] = useState<RadiusResult | null>(null);
  const [radiusMode, setRadiusMode] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [spotsLoading, setSpotsLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Mirror radiusResult in a ref so the debounced camera handler can read it.
  const radiusActiveRef = useRef(false);
  useEffect(() => {
    radiusActiveRef.current = radiusResult !== null;
  }, [radiusResult]);

  // Last fully-fetched region. A new viewport contained within it can be served
  // by filtering locally instead of calling the API again.
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

  // Serve from the cached region when zooming into it; otherwise fetch (debounced).
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

  // Reverse-geocode resolver with distance-threshold + grid cache (fewer API calls).
  const resolveAddress = useRef(
    createAddressResolver({
      fetchAddress: (c) => reverseGeocode(c).then((r) => r.address),
    }),
  );

  const handleCameraChange = useCallback((c: LatLng, b: Bounds | null) => {
    setCenter(c);
    setBounds(b);
    // In radius mode the list is frozen to the search result; skip viewport fetch.
    if (!radiusActiveRef.current && b) applyViewport(b);

    // Update the centre address (skipped internally for tiny moves / cache hits).
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

  const handleClear = useCallback(() => {
    setRadiusResult(null);
    setSelectedId(null);
    if (bounds) fetchAndCache(bounds);
  }, [bounds, fetchAndCache]);

  const handleToggleRadius = useCallback(
    (on: boolean) => {
      setRadiusMode(on);
      // Turning off clears any active result and returns to the viewport list.
      if (!on) {
        setRadiusResult(null);
        setSelectedId(null);
        if (bounds) fetchAndCache(bounds);
      }
    },
    [bounds, fetchAndCache],
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

  // Only draw a circle when radius search is enabled: frozen at the searched
  // centre while a result is shown, otherwise a live preview at the map centre.
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
            onClear={handleClear}
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
