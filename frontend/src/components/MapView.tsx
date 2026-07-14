// 地図表示コンポーネント
'use client';

import {
  APIProvider,
  InfoWindow,
  Map,
  Marker,
  useMap,
} from '@vis.gl/react-google-maps';
import { useEffect, useRef } from 'react';
import type { Spot, LatLng, Bounds } from '@/lib/types';

// 日本の地理的中心(緯度経度)
const JAPAN_CENTER: LatLng = { lat: 37.5, lng: 137.0 };
const JAPAN_ZOOM = 5;

interface MapViewProps {
  apiKey: string;
  spots: Spot[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  /** 表示範囲を設定する */
  initialBounds?: Bounds;
  /** 半径(circle)に応じて副作用として地図に表示する */
  circle?: { center: LatLng; radiusKm: number } | null;
  /** マップ操作が終了した時に中心位置と表示範囲を取得する */
  onCameraChange?: (center: LatLng, bounds: Bounds | null) => void;
}

/** Mapコンテキスト内で実行されるため、google.maps.Mapインスタンスにアクセスできる */
function MapInner({
  spots,
  selectedId,
  onSelect,
  initialBounds,
  circle,
  onCameraChange,
}: Omit<MapViewProps, 'apiKey'>) {
  const map = useMap();
  const didFit = useRef(false);
  const circleRef = useRef<google.maps.Circle | null>(null);

  // 空の地図領域をクリックした時に地図を中心に移動して選択を解除する
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener(
      'click',
      (e: google.maps.MapMouseEvent) => {
        if (e.latLng) map.panTo(e.latLng);
        onSelect(null);
      },
    );
    return () => listener.remove();
  }, [map, onSelect]);

  // 
  useEffect(() => {
    if (!map || !initialBounds || didFit.current) return;
    map.fitBounds(
      {
        south: initialBounds.minLat,
        west: initialBounds.minLng,
        north: initialBounds.maxLat,
        east: initialBounds.maxLng,
      },
      0,
    );
    didFit.current = true;
  }, [map, initialBounds]);

  // マップ操作が終了した時に中心位置と表示範囲を取得する
  useEffect(() => {
    if (!map || !onCameraChange) return;
    const emit = () => {
      const c = map.getCenter();
      if (!c) return;
      const b = map.getBounds();
      let bounds: Bounds | null = null;
      if (b) {
        const ne = b.getNorthEast();
        const sw = b.getSouthWest();
        bounds = {
          minLat: sw.lat(),
          minLng: sw.lng(),
          maxLat: ne.lat(),
          maxLng: ne.lng(),
        };
      }
      onCameraChange({ lat: c.lat(), lng: c.lng() }, bounds);
    };
    const listener = map.addListener('idle', emit);
    return () => listener.remove();
  }, [map, onCameraChange]);

  // スポットが選択された時に地図をそのスポットの位置に移動する
  useEffect(() => {
    if (!map || selectedId == null) return;
    const s = spots.find((x) => x.id === selectedId);
    if (s) map.panTo({ lat: s.lat, lng: s.lng });
  }, [map, selectedId, spots]);

  // 半径(circle)に応じて副作用として地図に表示する
  useEffect(() => {
    if (!map) return;
    if (!circle) {
      circleRef.current?.setMap(null);
      circleRef.current = null;
      return;
    }
    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        strokeColor: '#2563eb',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#2563eb',
        fillOpacity: 0.08,
        clickable: false,
        map,
      });
    }
    circleRef.current.setCenter(circle.center);
    circleRef.current.setRadius(circle.radiusKm * 1000);
    return () => {};
  }, [map, circle]);

  const selectedSpot = spots.find((s) => s.id === selectedId) ?? null;
  const selectedIcon: google.maps.Symbol | undefined =
    typeof google !== 'undefined'
      ? {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        }
      : undefined;

  return (
    <>
      {spots.map((s) => (
        <Marker
          key={s.id}
          position={{ lat: s.lat, lng: s.lng }}
          title={s.name}
          icon={s.id === selectedId ? selectedIcon : undefined}
          zIndex={s.id === selectedId ? 1000 : undefined}
          onClick={() => onSelect(s.id)}
        />
      ))}

      {selectedSpot && (
        <InfoWindow
          position={{ lat: selectedSpot.lat, lng: selectedSpot.lng }}
          onCloseClick={() => onSelect(null)}
        >
          <div className="min-w-[160px] text-gray-800">
            <p className="text-sm font-bold">{selectedSpot.name}</p>
            <p className="mt-0.5 text-xs text-gray-500">
              {selectedSpot.category}
            </p>
            {selectedSpot.address && (
              <p className="mt-1 text-xs">{selectedSpot.address}</p>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

/** 画面中央に固定のピン表示 */
function CenterMarker() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
      <svg
        width="34"
        height="34"
        viewBox="0 0 24 24"
        className="-translate-y-1/2 drop-shadow"
        aria-hidden
      >
        <path
          d="M12 2c-3.9 0-7 3.1-7 7 0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"
          fill="#ef4444"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
      </svg>
    </div>
  );
}

export default function MapView({
  apiKey,
  spots,
  selectedId,
  onSelect,
  initialBounds,
  circle,
  onCameraChange,
}: MapViewProps) {
  return (
    <div className="relative h-full w-full">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={JAPAN_CENTER}
          defaultZoom={JAPAN_ZOOM}
          gestureHandling="greedy"
          clickableIcons={false}
          className="h-full w-full"
        >
          <MapInner
            spots={spots}
            selectedId={selectedId}
            onSelect={onSelect}
            initialBounds={initialBounds}
            circle={circle}
            onCameraChange={onCameraChange}
          />
        </Map>
        <CenterMarker />
      </APIProvider>
    </div>
  );
}
