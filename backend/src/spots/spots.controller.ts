// spotsコントローラー(ルーティングとデータ変換)
import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SpotsService } from './spots.service';
import { QuerySpotsDto } from './dto/query-spots.dto';

@Controller('spots')
export class SpotsController {
  constructor(private readonly spotsService: SpotsService) {}

  /**
   * GET /spots — スポットを位置条件で検索する。
   * パラメータの組み合わせで3つのモードを使い分ける（判定は resolveSearchMode）:
   *   ?lat&lng&radius              -> 半径検索（radius は km）
   *   ?minLat&minLng&maxLat&maxLng -> 表示範囲（矩形）検索
   *   (パラメータなし)              -> 全件
  */
  @Get()
  async find(
    @Query() query: QuerySpotsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // キャッシュは、maxで60秒に設定する
    res.setHeader('Cache-Control', 'public, max-age=60');
    return this.spotsService.findSpots(query);
  }
}
