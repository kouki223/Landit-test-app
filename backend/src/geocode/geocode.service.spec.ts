import { GeocodeService, quantizeKey } from './geocode.service';

describe('quantizeKey', () => {
  it('rounds coordinates to 3 decimals', () => {
    expect(quantizeKey(35.681236, 139.767125)).toBe('35.681,139.767');
  });

  it('maps nearby coordinates (~10m) to the same key', () => {
    expect(quantizeKey(35.68124, 139.76713)).toBe(quantizeKey(35.68119, 139.76708));
  });
});

describe('GeocodeService.reverse', () => {
  beforeEach(() => {
    // No real key -> deterministic fallback, no network calls.
    delete process.env.GOOGLE_GEOCODING_API_KEY;
  });

  it('returns cached=false on first call and cached=true on the second', async () => {
    const service = new GeocodeService();
    const first = await service.reverse(35.681236, 139.767125);
    expect(first.cached).toBe(false);
    expect(first.address).toContain('付近');

    const second = await service.reverse(35.681236, 139.767125);
    expect(second.cached).toBe(true);
    expect(second.address).toBe(first.address);
  });

  it('serves a tiny map move from cache thanks to quantisation', async () => {
    const service = new GeocodeService();
    await service.reverse(35.6812, 139.7671);
    const nearby = await service.reverse(35.68124, 139.76713); // same quantised cell
    expect(nearby.cached).toBe(true);
  });
});
