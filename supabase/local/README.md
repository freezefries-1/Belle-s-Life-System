# Local Supabase test stack

A minimal stand-in for Supabase used by the automated tests. It runs Postgres, Auth (GoTrue), the REST API (PostgREST) and Mailpit, with `gateway.mjs` routing `/auth/v1` and `/rest/v1` on port 54321. It uses throwaway local secrets only (`.env`, generated and git-ignored).

```bash
supabase/local/start.sh          # starts containers + applies ../migrations
node supabase/local/gateway.mjs  # API gateway on :54321
set -a; source supabase/local/.env; set +a
node supabase/tests/db-security.test.mjs                       # RLS / integrity tests (two accounts)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY npx next dev            # app in cloud mode
```

Mailpit (password-reset emails) is at http://localhost:54324. Stop with `docker compose -f supabase/local/docker-compose.yml down -v`.
