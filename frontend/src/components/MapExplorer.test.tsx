import { render, screen, waitFor } from '@testing-library/react';
import MapExplorer from './MapExplorer';
import { fetchAllSpots } from '@/lib/api';
import type { Spot } from '@/lib/types';

// Stub the map component so tests don't load the Google Maps SDK.
jest.mock('./MapView', () => ({
  __esModule: true,
  default: ({ spots }: { spots: Spot[] }) => (
    <div data-testid="map-view">markers: {spots.length}</div>
  ),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  fetchAllSpots: jest.fn(),
}));

const sampleSpots: Spot[] = [
  { id: 1, name: 'A', category: 'x', address: null, lat: 35.6, lng: 139.7 },
  { id: 2, name: 'B', category: 'y', address: null, lat: 35.7, lng: 139.8 },
];

describe('MapExplorer', () => {
  it('fetches all spots on mount and passes them to the map', async () => {
    (fetchAllSpots as jest.Mock).mockResolvedValue(sampleSpots);

    render(<MapExplorer />);

    // MapView renders (API key is provided by jest.env.js)
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('map-view')).toHaveTextContent('markers: 2'),
    );
  });
});
