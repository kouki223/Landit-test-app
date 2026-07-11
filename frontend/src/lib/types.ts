export interface Spot {
  id: number;
  name: string;
  category: string;
  address: string | null;
  lat: number;
  lng: number;
  /** Present only for radius-search results. */
  distanceM?: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Geographic bounding box (viewport). */
export interface Bounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}
