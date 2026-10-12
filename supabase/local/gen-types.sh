#!/usr/bin/env bash
# Regenerate src/types/supabase.ts from the local test database (run start.sh first).
# Against a hosted project you can use the Supabase CLI instead:
#   npx supabase gen types typescript --project-id <project-ref> --schema public > src/types/supabase.ts
set -euo pipefail
cd "$(dirname "$0")"
NETWORK=$(docker inspect "$(docker compose ps -q db)" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}')
OUT=../../src/types/supabase.ts
{
  echo "// Generated from the database schema by supabase/local/gen-types.sh — do not edit by hand."
  echo "// App code uses the row types in ./database.ts, which are derived from these."
  echo
  docker run --rm --network "$NETWORK" \
    -e PG_META_DB_URL="postgresql://postgres:postgres@db:5432/postgres" \
    -e PG_META_GENERATE_TYPES=typescript \
    -e PG_META_GENERATE_TYPES_INCLUDED_SCHEMAS=public \
    supabase/postgres-meta:v0.91.0 node dist/server/server.js
} > "$OUT.tmp"
mv "$OUT.tmp" "$OUT"
echo "Wrote src/types/supabase.ts"
