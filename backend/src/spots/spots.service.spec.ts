import { SpotsService, resolveSearchMode } from './spots.service';

describe('resolveSearchMode', () => {
  it('returns "radius" when lat, lng and radius are present', () => {
    expect(resolveSearchMode({ lat: 35.6, lng: 139.7, radius: 5 })).toBe('radius');
  });

  it('returns "bbox" when all four bounds are present', () => {
    expect(
      resolveSearchMode({ minLat: 35, minLng: 139, maxLat: 36, maxLng: 140 }),
    ).toBe('bbox');
  });

  it('returns "all" when no params are present', () => {
    expect(resolveSearchMode({})).toBe('all');
  });

  it('prefers radius over bbox when both are present', () => {
    expect(
      resolveSearchMode({
        lat: 35.6,
        lng: 139.7,
        radius: 5,
        minLat: 35,
        minLng: 139,
        maxLat: 36,
        maxLng: 140,
      }),
    ).toBe('radius');
  });

  it('falls back to "all" when bbox is only partially specified', () => {
    expect(resolveSearchMode({ minLat: 35, minLng: 139 })).toBe('all');
  });
});

describe('SpotsService.findSpots', () => {
  function makeService(rawRows: any[]) {
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rawRows),
    };
    const repo: any = { createQueryBuilder: jest.fn(() => qb) };
    return { service: new SpotsService(repo), qb };
  }

  it('maps raw string columns to typed numbers and rounds distance', async () => {
    const { service, qb } = makeService([
      {
        id: '1',
        name: '東京タワー',
        category: '観光名所',
        address: '東京都港区',
        lat: '35.658581',
        lng: '139.745433',
        distanceM: '1494.7',
      },
    ]);

    const result = await service.findSpots({ lat: 35.65, lng: 139.74, radius: 3 });

    expect(result).toEqual([
      {
        id: 1,
        name: '東京タワー',
        category: '観光名所',
        address: '東京都港区',
        lat: 35.658581,
        lng: 139.745433,
        distanceM: 1495,
      },
    ]);
    // radius mode must filter with ST_DWithin
    expect(qb.where).toHaveBeenCalledWith(
      expect.stringContaining('ST_DWithin'),
      expect.objectContaining({ radiusM: 3000 }),
    );
  });

  it('uses ST_MakeEnvelope for bbox mode and omits distanceM', async () => {
    const { service, qb } = makeService([
      {
        id: '2',
        name: 'X',
        category: 'c',
        address: null,
        lat: '35.6',
        lng: '139.7',
      },
    ]);

    const result = await service.findSpots({
      minLat: 35,
      minLng: 139,
      maxLat: 36,
      maxLng: 140,
    });

    expect(result[0]).not.toHaveProperty('distanceM');
    expect(result[0].address).toBeNull();
    expect(qb.where).toHaveBeenCalledWith(
      expect.stringContaining('ST_MakeEnvelope'),
      expect.any(Object),
    );
  });

  it('applies no WHERE clause in "all" mode', async () => {
    const { service, qb } = makeService([]);
    await service.findSpots({});
    expect(qb.where).not.toHaveBeenCalled();
  });
});
