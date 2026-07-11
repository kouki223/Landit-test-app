import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { GeocodeService } from './geocode.service';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';

@Controller('geocode')
export class GeocodeController {
  constructor(private readonly geocodeService: GeocodeService) {}

  /** GET /geocode/reverse?lat&lng -> { address, cached } */
  @Get('reverse')
  async reverse(
    @Query() query: ReverseGeocodeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Addresses are static; allow long-lived caching to further cut API calls.
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return this.geocodeService.reverse(query.lat, query.lng);
  }
}
