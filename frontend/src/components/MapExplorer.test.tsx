import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MapExplorer from './MapExplorer';
import { fetchSpotsInBounds, fetchSpotsInRadius } from '@/lib/api';
import type { Spot, Bounds, LatLng } from '@/lib/types';

// Stub the map: expose a button that simulates the map settling (camera change).
jest.mock('./MapView', () => ({
  __esModule: true,
  default: (props: {
    onCameraChange?: (c: LatLng, b: Bounds | null) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        props.onCameraChange?.(
          { lat: 35.5, lng: 139.5 },
          { minLat: 35, minLng: 139, maxLat: 36, maxLng: 140 },
        )
      }
    >
      trigger-camera
    </button>
  ),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  fetchSpotsInBounds: jest.fn(),
  fetchSpotsInRadius: jest.fn(),
}));

const viewportSpots: Spot[] = [
  { id: 1, name: 'A', category: 'x', address: null, lat: 35.6, lng: 139.7 },
  { id: 2, name: 'B', category: 'y', address: null, lat: 35.7, lng: 139.8 },
];
const radiusSpots: Spot[] = [
  { id: 1, name: 'A', category: 'x', address: null, lat: 35.6, lng: 139.7, distanceM: 800 },
];

describe('MapExplorer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchSpotsInBounds as jest.Mock).mockResolvedValue(viewportSpots);
    (fetchSpotsInRadius as jest.Mock).mockResolvedValue(radiusSpots);
  });

  it('fetches spots for the viewport bounds when the map settles', async () => {
    render(<MapExplorer />);
    expect(screen.getByText('0件のスポット')).toBeInTheDocument();

    fireEvent.click(screen.getByText('trigger-camera'));

    await waitFor(() =>
      expect(fetchSpotsInBounds).toHaveBeenCalledWith({
        minLat: 35,
        minLng: 139,
        maxLat: 36,
        maxLng: 140,
      }),
    );
    expect(await screen.findByText('2件のスポット')).toBeInTheDocument();
  });

  it('runs a radius search from the current centre on button click', async () => {
    render(<MapExplorer />);
    // establish a centre first
    fireEvent.click(screen.getByText('trigger-camera'));
    await screen.findByText('2件のスポット');

    fireEvent.click(screen.getByRole('button', { name: 'この範囲で検索' }));

    await waitFor(() =>
      expect(fetchSpotsInRadius).toHaveBeenCalledWith({ lat: 35.5, lng: 139.5 }, 5),
    );
    expect(await screen.findByText('半径5km以内のスポット')).toBeInTheDocument();
    expect(screen.getByText('1件のスポット')).toBeInTheDocument();
  });
});
