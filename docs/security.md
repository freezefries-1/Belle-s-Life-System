# Security review (Phase 8E, October 2026)

How belle's life system keeps your data private, what was checked, and the
settings to confirm in your own Supabase and Vercel dashboards.

## How your data is protected

- **The database enforces it.** Every table has Row Level Security on, with
  policies that only allow the signed-in owner (`(select auth.uid()) = user_id`).
  Links between records are composite keys that include the owner, so a
  record can't even point at another account's record. Hiding pages in the
  app is a convenience on top — not the protection.
- **Only the public key is in the app.** The browser gets the Supabase URL
  and the publishable (anon) key, which are designed to be public. The
  service-role / secret key is never used by the app and must never be added
  to Vercel.
- **Signed-in pages are protected twice:** `src/proxy.ts` sends signed-out
  visitors to `/login`, and the data itself is protected by the database.
- **Saving goes through two database functions** (`apply_changes`,
  `import_rows`) that run as the signed-in user (security invoker), check the
  account matches, and validate table and column names.
- **Sign-in redirects** only allow paths on this site (`src/lib/auth/redirect.ts`).
- **On a shared device:** signing out deletes the account's copy from the
  browser (Phase 8C/Stage C), and the service worker never caches your data.

## What was checked

| Check | Result |
| --- | --- |
| RLS on every table (`supabase/checks/rls-check.sql`) | 15/15 tables on; policies for `authenticated` only; signed-out (`anon`) can't read any table |
| Two-account database tests (`npm run test:db`) | 57 checks pass: no cross-account reads, writes, deletes, links or RPC calls |
| Browser tests (`npm run test:e2e`) | Account B can't see, change or delete A's task (in the app and directly in the database); signed-out reads return nothing; protected pages redirect; crafted `?next=` links stay on this site |
| Secrets in the built app and in git history | None. The only match was Supabase's own library code checking a key's prefix. The only env file in git is the empty `.env.example`. The local test database's default password (`postgres`) appears in the Docker test setup only |
| Error messages and logs | No credentials or other people's data. Save/import errors show the database's message to the signed-in owner; a page crash is logged to your own browser console only; the app writes no server logs of its own |
| Dependencies (`npm audit`) | **App (production): 0 vulnerabilities.** Development tools only — see below |
| Security headers | Added: no framing (`X-Frame-Options: DENY`, `frame-ancestors 'none'`), `nosniff`, `Referrer-Policy`, `Permissions-Policy` (no camera/mic/location), HSTS |

### Development-tool advisories (not part of the app)

- **Vitest** (unit test runner, 3.2.7) and its `tinypool`: the advisories
  apply when Vitest's UI server is running or worker options are
  attacker-controlled — neither happens here. The patched Vitest 4.1.11
  can't currently be installed because of an npm 10.9 bug
  (`Cannot read properties of null (reading 'edgesOut')`); forcing it with
  `--legacy-peer-deps` would change how the whole lockfile resolves and could
  break Vercel's install, so it wasn't done. Revisit when npm is updated.
- **eslint-config-next → micromatch/braces** (a slow pattern match): only
  processes this repository's own files during `npm run lint`. npm's
  suggested fix is a downgrade to Next 14's config, which would break linting.
  Revisit with the next Next.js update.

Neither is shipped to the browser or the server.

## Settings to confirm in your dashboards

**Supabase → Authentication**
- **Sign In / Providers → Email:** *Secure password change* on (asks for
  the current password); *Confirm email* on.
- **URL Configuration:** *Site URL* `https://belle-life-system.vercel.app`;
  *Redirect URLs* exactly `https://belle-life-system.vercel.app/auth/confirm`
  (plus `http://localhost:3000/auth/confirm` only if you develop locally).
  Avoid wildcards, and remove any you don't recognise.
- **Policies:** password minimum length 8 or more.

**Supabase → Database:** run `supabase/checks/rls-check.sql` in the SQL
Editor (read-only). Every row should show `rls_on = true`,
`policy_roles = authenticated`, `anon_can_select = false`.

**Vercel → Settings → Environment Variables:** only
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or
`…_ANON_KEY`). Nothing called service role or secret.

## Not done (and why)

- **A full Content-Security-Policy** (limiting which scripts can run) needs
  per-request nonces with Next.js's inline scripts; done wrong it breaks the
  app. The framing protection above is the part that matters most here.
- **No penetration test or third-party audit** — this is a structured
  self-review with automated tests.
