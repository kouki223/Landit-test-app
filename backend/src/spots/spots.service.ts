import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Spot } from './spot.entity';
import { QuerySpotsDto } from './dto/query-spots.dto';

export type SearchMode = 'radius' | 'bbox' | 'all';

export interface SpotResult {
  id: number;
  name: string;
  category: string;
  address: string | null;
  lat: number;
  lng: number;
  distanceM?: number;
}

/**
 * Decide which search to run purely from the presence of query params.
 * Kept as a standalone pure function so it can be unit-tested without a DB.
 */
export function resolveSearchMode(dto: QuerySpotsDto): SearchMode {
  if (dto.lat != null && dto.lng != null && dto.radius != null) return 'radius';
  if (
    dto.minLat != null &&
    dto.minLng != null &&
    dto.maxLat != null &&
    dto.maxLng != null
  ) {
    return 'bbox';
  }
  return 'all';
}

@Injectable()
export class SpotsService {
  constructor(
    @InjectRepository(Spot)
    private readonly repo: Repository<Spot>,
  ) {}

  async findSpots(dto: QuerySpotsDto): Promise<SpotResult[]> {
    const mode = resolveSearchMode(dto);

    const qb = this.repo
      .createQueryBuilder('spot')
      .select('spot.id', 'id')
      .addSelect('spot.name', 'name')
      .addSelect('spot.category', 'category')
      .addSelect('spot.address', 'address')
      // Convert the geography Point back to plain lat/lng for the client.
      .addSelect('ST_Y(spot.location::geometry)', 'lat')
      .addSelect('ST_X(spot.location::geometry)', 'lng');

    if (mode === 'radius') {
      qb
        .addSelect(
          'ST_Distance(spot.location, ST_MakePoint(:lng, :lat)::geography)',
          'distanceM',
        )
        // ST_DWithin uses the GiST index to keep radius search fast at scale.
        .where(
          'ST_DWithin(spot.location, ST_MakePoint(:lng, :lat)::geography, :radiusM)',
          { lng: dto.lng, lat: dto.lat, radiusM: (dto.radius as number) * 1000 },
        )
        .orderBy('"distanceM"', 'ASC');
    } else if (mode === 'bbox') {
      // && is the bounding-box overlap operator; it uses the spatial index.
      qb
        .where(
          'spot.location && ST_MakeEnvelope(:minLng, :minLat, :maxLng, :maxLat, 4326)::geography',
          {
            minLng: dto.minLng,
            minLat: dto.minLat,
            maxLng: dto.maxLng,
            maxLat: dto.maxLat,
          },
        )
        .orderBy('spot.id', 'ASC');
    } else {
      qb.orderBy('spot.id', 'ASC');
    }

    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      category: r.category,
      address: r.address ?? null,
      lat: Number(r.lat),
      lng: Number(r.lng),
      ...(r.distanceM != null ? { distanceM: Math.round(Number(r.distanceM)) } : {}),
    }));
  }
}
