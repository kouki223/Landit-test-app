import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SpotsService } from './spots.service';
import { QuerySpotsDto } from './dto/query-spots.dto';

@Controller('spots')
export class SpotsController {
  constructor(private readonly spotsService: SpotsService) {}

  /**
   * GET /spots
   *   ?lat&lng&radius              -> radius search (km)
   *   ?minLat&minLng&maxLat&maxLng -> viewport (bounding-box) search
   *   (no params)                  -> all spots
   */
  @Get()
  async find(
    @Query() query: QuerySpotsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Spot data is near-static: let the browser/CDN cache identical GET queries.
    res.setHeader('Cache-Control', 'public, max-age=60');
    return this.spotsService.findSpots(query);
  }
}
