// エンティティ(データベースとのマッピング)
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('spots')
export class Spot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    select: false,
  })
  location: unknown;
}
