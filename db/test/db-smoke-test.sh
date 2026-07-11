#!/usr/bin/env bash
#
# Smoke test for the automatic CSV import (Phase 1 / feature unit B).
# Verifies that `docker compose up db` produces a correctly seeded PostGIS database.
#
# Usage: ./db/test/db-smoke-test.sh
# Requires the `db` service to be running (docker compose up -d db).

set -euo pipefail

DB_USER="${POSTGRES_USER:-landit}"
DB_NAME="${POSTGRES_DB:-landit}"

CID="$(docker compose ps -q db)"
if [ -z "${CID}" ]; then
  echo "FAIL: db container is not running. Run 'docker compose up -d db' first." >&2
  exit 1
fi

psql() { docker exec "${CID}" psql -U "${DB_USER}" -d "${DB_NAME}" -tAc "$1"; }

fail() { echo "FAIL: $1" >&2; exit 1; }
pass() { echo "PASS: $1"; }

# 1. PostGIS extension is enabled
[ -n "$(psql "SELECT 1 FROM pg_extension WHERE extname='postgis';")" ] \
  || fail "PostGIS extension is not enabled"
pass "PostGIS extension enabled"

# 2. Every spot row was imported (CSV has 200 data rows)
COUNT="$(psql "SELECT count(*) FROM spots;")"
[ "${COUNT}" = "200" ] || fail "expected 200 spots, got ${COUNT}"
pass "spot count = 200"

# 3. No row has a NULL/invalid location (lat/long -> Point conversion succeeded)
NULLS="$(psql "SELECT count(*) FROM spots WHERE location IS NULL;")"
[ "${NULLS}" = "0" ] || fail "${NULLS} spots have a NULL location"
pass "all spots have a valid location"

# 4. Coordinates round-trip correctly (Tokyo Tower stored as ~35.658581,139.745433)
TT="$(psql "SELECT round(ST_Y(location::geometry)::numeric,4)||','||round(ST_X(location::geometry)::numeric,4) FROM spots WHERE name='東京タワー';")"
[ "${TT}" = "35.6586,139.7454" ] || fail "Tokyo Tower coordinates wrong: ${TT} (lat,lng order may be swapped)"
pass "coordinates round-trip correctly (lng/lat order correct)"

# 5. Radius search works: 六本木ヒルズ is within 5km of Tokyo Tower
HIT="$(psql "SELECT count(*) FROM spots WHERE name='六本木ヒルズ' AND ST_DWithin(location, ST_MakePoint(139.745433,35.658581)::geography, 5000);")"
[ "${HIT}" = "1" ] || fail "ST_DWithin radius search did not find 六本木ヒルズ within 5km"
pass "ST_DWithin radius search works"

# 6. Spatial (GiST) index exists
[ -n "$(psql "SELECT 1 FROM pg_indexes WHERE tablename='spots' AND indexname='idx_spots_location';")" ] \
  || fail "GiST spatial index idx_spots_location is missing"
pass "GiST spatial index present"

echo ""
echo "All DB smoke tests passed."
