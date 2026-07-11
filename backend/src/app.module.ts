import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Spot } from './spots/spot.entity';
import { SpotsModule } from './spots/spots.module';
import { GeocodeModule } from './geocode/geocode.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number(process.env.POSTGRES_PORT) || 5432,
      username: process.env.POSTGRES_USER || 'landit',
      password: process.env.POSTGRES_PASSWORD || 'landit_password',
      database: process.env.POSTGRES_DB || 'landit',
      entities: [Spot],
      // Schema is owned by the DB init scripts (db/init), so never auto-sync.
      synchronize: false,
    }),
    SpotsModule,
    GeocodeModule,
  ],
})
export class AppModule {}
