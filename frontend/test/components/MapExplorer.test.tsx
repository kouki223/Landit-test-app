import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MapExplorer from '@/components/MapExplorer';
import {
  fetchSpotsInBounds,
  fetchSpotsInRadius,
  reverseGeocode,
} from '@/lib/api';
import type { Spot, Bounds, LatLng } from '@/lib/types';

// Stub the map: expose buttons that simulate the map settling at different viewports.
jest.mock('@/components/MapView', () => ({
  __esModule: true,
  default: (props: {
    onCameraChange?: (c: LatLng, b: Bounds | null) => void;
  }) => (
    <>
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
      <button
        type="button"
        onClick={() =>
          props.onCameraChange?.(
            { lat: 35.55, lng: 139.65 },
            { minLat: 35.5, minLng: 139.6, maxLat: 35.65, maxLng: 139.75 },
          )
        }
      >
        zoom-in
      </button>
    </>
  ),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  fetchSpotsInBounds: jest.fn(),
  fetchSpotsInRadius: jest.fn(),
  reverseGeocode: jest.fn(),
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
    (reverseGeocode as jest.Mock).mockResolvedValue({
      address: '東京都千代田区',
      cached: false,
    });
  });

  it('shows the reverse-geocoded centre address after the map settles', async () => {
    render(<MapExplorer />);
    fireEvent.click(screen.getByText('trigger-camera'));

    await waitFor(() =>
      expect(reverseGeocode).toHaveBeenCalledWith({ lat: 35.5, lng: 139.5 }),
    );
    expect(await screen.findByText('東京都千代田区')).toBeInTheDocument();
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

    // enable radius mode, then search
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'この範囲で検索' }));

    await waitFor(() =>
      expect(fetchSpotsInRadius).toHaveBeenCalledWith({ lat: 35.5, lng: 139.5 }, 5),
    );
    expect(await screen.findByText('半径5km以内のスポット')).toBeInTheDocument();
    expect(screen.getByText('1件のスポット')).toBeInTheDocument();

    // Toggling radius OFF clears the result and returns to the viewport list.
    fireEvent.click(screen.getByRole('switch'));
    expect(await screen.findByText('表示範囲のスポット')).toBeInTheDocument();
    expect(screen.getByText('2件のスポット')).toBeInTheDocument();
  });

  it('serves a zoom-in from cache without a second API call', async () => {
    render(<MapExplorer />);

    // Wide viewport: fetches and caches (2 spots).
    fireEvent.click(screen.getByText('trigger-camera'));
    expect(await screen.findByText('2件のスポット')).toBeInTheDocument();
    expect(fetchSpotsInBounds).toHaveBeenCalledTimes(1);

    // Zoom into a contained sub-viewport: filtered locally, no new fetch.
    fireEvent.click(screen.getByText('zoom-in'));
    expect(await screen.findByText('1件のスポット')).toBeInTheDocument();
    expect(fetchSpotsInBounds).toHaveBeenCalledTimes(1);
  });
});
