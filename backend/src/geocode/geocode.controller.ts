// コントローラー(ルーティングとデータ変換)
import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { GeocodeService } from './geocode.service';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';

@Controller('geocode')
export class GeocodeController {
  constructor(private readonly geocodeService: GeocodeService) {}

  /** /geocode/reverse?lat&lngをGETメソッドで実行してservice層のreverseメソッドを呼び出す*/
  @Get('reverse')
  async reverse(
    // queryパラメータを受け取って、ReverseGeocodeDtoに変換する
    @Query() query: ReverseGeocodeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // キャッシュは、maxで24時間を設定する
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return this.geocodeService.reverse(query.lat, query.lng);
  }
}
