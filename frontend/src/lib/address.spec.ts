import { createAddressResolver } from './address';

describe('createAddressResolver', () => {
  it('fetches on the first call', async () => {
    const fetchAddress = jest.fn().mockResolvedValue('東京都港区');
    const resolve = createAddressResolver({ fetchAddress });

    const r = await resolve({ lat: 35.6586, lng: 139.7454 });

    expect(r).toEqual({ address: '東京都港区', source: 'fetch' });
    expect(fetchAddress).toHaveBeenCalledTimes(1);
  });

  it('skips (returns null) when the centre barely moved', async () => {
    const fetchAddress = jest.fn().mockResolvedValue('A');
    const resolve = createAddressResolver({ fetchAddress, minMoveMeters: 50 });

    await resolve({ lat: 35.6586, lng: 139.7454 });
    const r2 = await resolve({ lat: 35.65861, lng: 139.74541 }); // ~1m away

    expect(r2).toBeNull();
    expect(fetchAddress).toHaveBeenCalledTimes(1);
  });

  it('serves from cache when moving within the same grid cell', async () => {
    const fetchAddress = jest.fn().mockResolvedValue('A');
    // ~1.1km cells; move ~28m => past the move threshold but same cell.
    const resolve = createAddressResolver({
      fetchAddress,
      minMoveMeters: 5,
      decimals: 2,
    });

    await resolve({ lat: 35.6586, lng: 139.7454 });
    const r2 = await resolve({ lat: 35.6588, lng: 139.7456 });

    expect(r2).toEqual({ address: 'A', source: 'cache' });
    expect(fetchAddress).toHaveBeenCalledTimes(1);
  });

  it('fetches again for a different grid cell', async () => {
    const fetchAddress = jest
      .fn()
      .mockResolvedValueOnce('A')
      .mockResolvedValueOnce('B');
    const resolve = createAddressResolver({ fetchAddress, minMoveMeters: 5 });

    const r1 = await resolve({ lat: 35.0, lng: 139.0 });
    const r2 = await resolve({ lat: 36.0, lng: 140.0 });

    expect(r1?.address).toBe('A');
    expect(r2).toEqual({ address: 'B', source: 'fetch' });
    expect(fetchAddress).toHaveBeenCalledTimes(2);
  });
});
