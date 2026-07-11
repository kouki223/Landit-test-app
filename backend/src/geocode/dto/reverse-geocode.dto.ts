import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ReverseGeocodeDto {
  @Type(() => Number) @IsNumber() lat: number;
  @Type(() => Number) @IsNumber() lng: number;
}
