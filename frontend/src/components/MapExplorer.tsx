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
  const [address, setAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  // Mirror radiusResult in a ref so the debounced camera handler can read it.
  const radiusActiveRef = useRef(false);
  useEffect(() => {
    radiusActiveRef.current = radiusResult !== null;
  }, [radiusResult]);

  const loadBounds = useRef(
    debounce((b: Bounds) => {
      fetchSpotsInBounds(b)
        .then(setSpots)
        .catch((err) => console.error('Failed to load spots in bounds', err));
    }, 400),
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
    if (!radiusActiveRef.current && b) loadBounds.current(b);

    // Update the centre address (skipped internally for tiny moves / cache hits).
    setAddressLoading(true);
    resolveAddress
      .current(c)
      .then((res) => {
        if (res) setAddress(res.address);
      })
      .catch((err) => console.error('Reverse geocode failed', err))
      .finally(() => setAddressLoading(false));
  }, []);

  const handleSearch = useCallback(() => {
    if (!center) return;
    setRadiusResult({ center, radiusKm });
    setSelectedId(null);
    fetchSpotsInRadius(center, radiusKm)
      .then(setSpots)
      .catch((err) => console.error('Radius search failed', err));
  }, [center, radiusKm]);

  const handleClear = useCallback(() => {
    setRadiusResult(null);
    setSelectedId(null);
    if (bounds) {
      fetchSpotsInBounds(bounds)
        .then(setSpots)
        .catch((err) => console.error('Failed to reload viewport', err));
    }
  }, [bounds]);

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

  // Frozen circle while a radius result is shown; otherwise a live preview at centre.
  const circle = radiusResult ?? (center ? { center, radiusKm } : null);

  return (
    <main className="flex h-full w-full flex-col">
      <AddressBar address={address} loading={addressLoading} />
      <div className="flex min-h-0 flex-1">
        <aside className="w-80 shrink-0 overflow-hidden border-r bg-white">
          <SpotList
            spots={spots}
            selectedId={selectedId}
            onSelect={setSelectedId}
            title={
              radiusResult
                ? `半径${radiusResult.radiusKm}km以内のスポット`
                : '表示範囲のスポット'
            }
          />
        </aside>
        <div className="relative flex-1">
          <RadiusControl
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
            onSearch={handleSearch}
            onClear={handleClear}
            active={radiusResult !== null}
            disabled={center === null}
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
