import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query params for GET /spots. Three mutually-exclusive modes are inferred
 * from which params are present (see resolveSearchMode):
 *   - radius: lat + lng + radius(km)
 *   - bbox:   minLat + minLng + maxLat + maxLng
 *   - all:    (none) -> every spot
 */
export class QuerySpotsDto {
  // --- radius search ---
  @IsOptional() @Type(() => Number) @IsNumber() lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() lng?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) radius?: number; // kilometres

  // --- bounding-box (viewport) search ---
  @IsOptional() @Type(() => Number) @IsNumber() minLat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() minLng?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxLat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxLng?: number;
}
