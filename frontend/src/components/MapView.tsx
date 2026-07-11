'use client';

import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useRef } from 'react';
import type { Spot, LatLng, Bounds } from '@/lib/types';

// Rough geographic centre of Japan, used before the fit-to-spots runs.
const JAPAN_CENTER: LatLng = { lat: 37.5, lng: 137.0 };
const JAPAN_ZOOM = 5;

interface MapViewProps {
  apiKey: string;
  spots: Spot[];
  /** Fit the viewport to all spots once, on first load (nationwide view). */
  fitToSpots?: boolean;
  /** Called (on map idle) with the current centre and viewport bounds. */
  onCameraChange?: (center: LatLng, bounds: Bounds | null) => void;
}

/** Runs inside the Map context so it can access the google.maps.Map instance. */
function MapInner({
  spots,
  fitToSpots,
  onCameraChange,
}: Omit<MapViewProps, 'apiKey'>) {
  const map = useMap();
  const didFit = useRef(false);

  // Clicking the map recenters it on the clicked point (centre marker follows).
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener(
      'click',
      (e: google.maps.MapMouseEvent) => {
        if (e.latLng) map.panTo(e.latLng);
      },
    );
    return () => listener.remove();
  }, [map]);

  // Fit to all spots once on initial load.
  useEffect(() => {
    if (!map || !fitToSpots || didFit.current || spots.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    spots.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
    map.fitBounds(bounds, 48);
    didFit.current = true;
  }, [map, spots, fitToSpots]);

  // Emit centre + bounds whenever the camera settles.
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

  return (
    <>
      {spots.map((s) => (
        <Marker key={s.id} position={{ lat: s.lat, lng: s.lng }} title={s.name} />
      ))}
    </>
  );
}

/** Fixed pin at the map centre — always marks the search origin. */
function CenterMarker() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
      {/* pin whose tip sits exactly on the centre */}
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
  fitToSpots,
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
            fitToSpots={fitToSpots}
            onCameraChange={onCameraChange}
          />
        </Map>
        <CenterMarker />
      </APIProvider>
    </div>
  );
}
