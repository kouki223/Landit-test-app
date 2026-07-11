import { isContained, spotInBounds, filterSpots } from './viewportCache';
import type { Spot, Bounds } from './types';

const outer: Bounds = { minLat: 35, minLng: 139, maxLat: 36, maxLng: 140 };

describe('isContained', () => {
  it('is true for a strictly inner box', () => {
    expect(
      isContained({ minLat: 35.2, minLng: 139.2, maxLat: 35.8, maxLng: 139.8 }, outer),
    ).toBe(true);
  });

  it('is true for an equal box', () => {
    expect(isContained(outer, outer)).toBe(true);
  });

  it('is false when it extends beyond the outer box', () => {
    expect(
      isContained({ minLat: 34.9, minLng: 139.2, maxLat: 35.8, maxLng: 139.8 }, outer),
    ).toBe(false);
  });
});

describe('spotInBounds / filterSpots', () => {
  const spots: Spot[] = [
    { id: 1, name: 'in', category: 'c', address: null, lat: 35.6, lng: 139.7 },
    { id: 2, name: 'out', category: 'c', address: null, lat: 35.95, lng: 139.95 },
  ];

  it('spotInBounds checks membership', () => {
    expect(spotInBounds(spots[0], { minLat: 35.5, minLng: 139.6, maxLat: 35.7, maxLng: 139.8 })).toBe(true);
    expect(spotInBounds(spots[1], { minLat: 35.5, minLng: 139.6, maxLat: 35.7, maxLng: 139.8 })).toBe(false);
  });

  it('filterSpots returns only spots inside the box', () => {
    const inner: Bounds = { minLat: 35.5, minLng: 139.6, maxLat: 35.7, maxLng: 139.8 };
    expect(filterSpots(spots, inner)).toEqual([spots[0]]);
  });
});
