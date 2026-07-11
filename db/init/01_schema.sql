-- Enable PostGIS extension for geospatial queries (ST_DWithin, GiST index, etc.)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Spots table: coordinates are stored as a single geography(Point) column
-- so PostGIS can compute distances in metres on the WGS84 (SRID 4326) ellipsoid.
CREATE TABLE IF NOT EXISTS spots (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL,
  category TEXT NOT NULL,
  address  TEXT,
  location geography(Point, 4326) NOT NULL
);

-- GiST index makes bounding-box and radius searches fast even as the dataset grows.
CREATE INDEX IF NOT EXISTS idx_spots_location ON spots USING GIST (location);
-- Secondary index for potential category filtering.
CREATE INDEX IF NOT EXISTS idx_spots_category ON spots (category);
