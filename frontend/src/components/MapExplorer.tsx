'use client';

import { useEffect, useState } from 'react';
import MapView from './MapView';
import { fetchAllSpots } from '@/lib/api';
import type { Spot } from '@/lib/types';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export default function MapExplorer() {
  const [spots, setSpots] = useState<Spot[]>([]);

  useEffect(() => {
    fetchAllSpots()
      .then(setSpots)
      .catch((err) => console.error('Failed to load spots', err));
  }, []);

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
    <main className="h-full w-full">
      <MapView apiKey={API_KEY} spots={spots} fitToSpots />
    </main>
  );
}
