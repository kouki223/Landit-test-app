'use client';

import { useCallback, useRef, useState } from 'react';
import MapView from './MapView';
import SpotList from './SpotList';
import { fetchSpotsInBounds } from '@/lib/api';
import { debounce } from '@/lib/geo';
import type { Spot, LatLng, Bounds } from '@/lib/types';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

// Padded bounding box covering the whole spot dataset (all of Japan).
const JAPAN_BOUNDS: Bounds = { minLat: 24, minLng: 122, maxLat: 46, maxLng: 146 };

export default function MapExplorer() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Debounced viewport fetch: only fires once the map settles.
  const loadBounds = useRef(
    debounce((b: Bounds) => {
      fetchSpotsInBounds(b)
        .then(setSpots)
        .catch((err) => console.error('Failed to load spots in bounds', err));
    }, 400),
  );

  const handleCameraChange = useCallback(
    (_center: LatLng, bounds: Bounds | null) => {
      if (bounds) loadBounds.current(bounds);
    },
    [],
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

  return (
    <main className="flex h-full w-full">
      <aside className="w-80 shrink-0 border-r bg-white">
        <SpotList
          spots={spots}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </aside>
      <div className="relative flex-1">
        <MapView
          apiKey={API_KEY}
          spots={spots}
          selectedId={selectedId}
          onSelect={setSelectedId}
          initialBounds={JAPAN_BOUNDS}
          onCameraChange={handleCameraChange}
        />
      </div>
    </main>
  );
}
