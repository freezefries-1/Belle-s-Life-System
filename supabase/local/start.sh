#!/usr/bin/env bash
# Start the local Supabase test stack and apply ../migrations. Local use only.
set -euo pipefail
cd "$(dirname "$0")"
node keys.mjs > .env
set -a; source .env; set +a
docker compose up -d --wait db
for f in ../migrations/*.sql; do
  echo "applying $f"
  docker compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d postgres -f - < "$f"
done
docker compose up -d auth rest mailpit
