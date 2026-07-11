'use client';

import { useEffect, useRef } from 'react';
import type { Spot } from '@/lib/types';

interface SpotListProps {
  spots: Spot[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  title?: string;
}

function formatDistance(distanceM?: number): string | null {
  if (distanceM == null) return null;
  return distanceM >= 1000
    ? `${(distanceM / 1000).toFixed(1)}km`
    : `${distanceM}m`;
}

export default function SpotList({
  spots,
  selectedId,
  onSelect,
  title = '表示範囲のスポット',
}: SpotListProps) {
  const selectedRef = useRef<HTMLLIElement | null>(null);

  // Keep the highlighted row visible when selection is driven from the map.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        <p className="text-xs text-gray-500">{spots.length}件のスポット</p>
      </div>

      {spots.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-400">
          この範囲にスポットはありません
        </div>
      ) : (
        <ul className="flex-1 divide-y overflow-y-auto">
          {spots.map((s) => {
            const selected = s.id === selectedId;
            const distance = formatDistance(s.distanceM);
            return (
              <li key={s.id} ref={selected ? selectedRef : undefined}>
                <button
                  type="button"
                  onClick={() => onSelect(selected ? null : s.id)}
                  className={`flex w-full flex-col items-start px-4 py-2 text-left transition-colors ${
                    selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-medium text-gray-800">
                    {s.name}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5">
                      {s.category}
                    </span>
                    {distance && <span>{distance}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
