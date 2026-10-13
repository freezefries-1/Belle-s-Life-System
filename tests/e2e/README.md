# End-to-end tests

Real browser tests (Playwright) of the everyday workflow, account isolation
and phone use. They run **only against a local test setup** — the tests stop
straight away if the app or its database isn't on this machine, so they can
never touch production data.

## What's covered

- `workflow.spec.ts` — sign in → create a task → assign a sprint → make it
  today's Highlight → complete it → create a project → add a project task →
  create a recurring task (and check reloads don't duplicate it) → complete a
  Micro-Commitment → write the Kaizen Log → complete a Weekly Review → sign
  out. Every step is checked in the database too.
- `security.spec.ts` — protected pages redirect to sign-in; a crafted
  sign-in link can't send you to another site; one account can't see, change
  or delete another's data (in the app and directly in the database); signed-
  out visitors can read nothing; and a phone run (bottom bar, capture, More,
  same data on a second device).

## Running them

Needs Docker (for the local Supabase stack) and Node.

```bash
# 1. Local Supabase (Postgres, auth, API) with all migrations applied
supabase/local/start.sh
node supabase/local/gateway.mjs &          # serves it on http://localhost:54321

# 2. Build and start the app pointed at it
set -a; source supabase/local/.env; set +a
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY npm run build
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY npx next start -p 3001 &

# 3. Run
npm run test:e2e
```

Each run creates fresh throwaway accounts in the local database.
