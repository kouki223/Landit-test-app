'use client';

import Spinner from './Spinner';

const PRESETS = [1, 3, 5, 10];

interface RadiusControlProps {
  enabled: boolean;
  onToggle: (on: boolean) => void;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
  onSearch: () => void;
  onClear: () => void;
  /** 半径検索結果が表示されている時にtrue */
  active: boolean;
  /** 地図の中心位置が不明な時にtrue */
  disabled?: boolean;
  /** 半径検索リクエストが実行中の時にtrue */
  searching?: boolean;
}

export default function RadiusControl({
  enabled,
  onToggle,
  radiusKm,
  onRadiusChange,
  onSearch,
  onClear,
  active,
  disabled = false,
  searching = false,
}: RadiusControlProps) {
  return (
    <div className="absolute left-1/2 top-3 z-20 w-[min(92%,420px)] -translate-x-1/2 rounded-lg bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-800">半径検索</label>
        <div className="flex items-center gap-2">
          {enabled && (
            <span className="text-sm tabular-nums text-blue-600">
              {radiusKm}km
            </span>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="半径検索の表示切替"
            onClick={() => onToggle(!enabled)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              enabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {enabled && (
        <>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={radiusKm}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            className="mt-2 w-full accent-blue-600"
            aria-label="検索半径(km)"
          />

          <div className="mt-2 flex items-center gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onRadiusChange(p)}
                className={`rounded border px-2 py-0.5 text-xs ${
                  radiusKm === p
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p}km
              </button>
            ))}

            <div className="ml-auto flex gap-1.5">
              {active && (
                <button
                  type="button"
                  onClick={onClear}
                  className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  クリア
                </button>
              )}
              <button
                type="button"
                onClick={onSearch}
                disabled={disabled || searching}
                className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {searching && <Spinner />}
                {searching ? '検索中…' : 'この範囲で検索'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
