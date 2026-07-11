-- Automatic CSV import, executed once when the database volume is first created
-- (files in /docker-entrypoint-initdb.d run on initial container startup).

-- Load the raw CSV (name, category, lat, long, address) into a staging table first,
-- then convert lat/long into a PostGIS geography Point.
CREATE TEMP TABLE spots_staging (
  name     TEXT,
  category TEXT,
  lat      DOUBLE PRECISION,
  long     DOUBLE PRECISION,
  address  TEXT
);

COPY spots_staging (name, category, lat, long, address)
  FROM '/seed/landit_coding_test_seed.csv'
  WITH (FORMAT csv, HEADER true);

-- NOTE: ST_MakePoint takes (longitude, latitude) order — X then Y.
INSERT INTO spots (name, category, address, location)
SELECT
  name,
  category,
  address,
  ST_SetSRID(ST_MakePoint(long, lat), 4326)::geography
FROM spots_staging;

DROP TABLE spots_staging;
