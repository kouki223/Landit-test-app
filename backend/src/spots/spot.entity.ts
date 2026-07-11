import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Maps the `spots` table created by db/init/01_schema.sql.
 * `location` is a PostGIS geography(Point). We never select it directly through
 * the entity — queries use raw ST_* expressions via the QueryBuilder — so it is
 * marked `select: false` to keep the ORM from touching the geography type.
 */
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
