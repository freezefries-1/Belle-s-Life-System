# Maintenance checklist

A personal app needs very little looking after. These are the small, regular
things that keep it safe.

## Weekly (2 minutes)

- [ ] **Download a backup** (Preferences → Your data → Download a backup) and
      store it off your phone. See [backup-and-recovery.md](backup-and-recovery.md).

## Monthly (10 minutes)

- [ ] **Supabase → Project → Usage:** well within the Free limits (database
      size, monthly active users, egress).
- [ ] **Supabase → Advisors (Security and Performance):** no new red
      warnings. Ask for help before acting on one you don't understand.
- [ ] **Vercel → Logs:** search `client-error`. See [monitoring.md](monitoring.md).
- [ ] **GitHub → Actions:** the latest run on `main` is green.
- [ ] **Supabase → Authentication → Users:** only accounts you expect.

## Every three months

- [ ] Check a backup restores: choose it in **Restore from a backup file** and
      look at the preview (you don't have to go ahead).
- [ ] Re-run `supabase/checks/rls-check.sql` in the Supabase SQL Editor (read-only):
      every table `rls_on = true`, `anon_can_select = false`.
- [ ] Re-check the dashboard settings in [security.md](security.md) ("Settings
      to confirm").
- [ ] Dependency updates, on a branch, never straight to `main`:
      1. `npm outdated`, then update a few packages at a time.
      2. `npm audit --omit=dev` should show 0 vulnerabilities for the app.
      3. Run lint, type check, unit tests, `npm run test:db` and
         `npm run test:e2e` locally. Wait for CI to pass.
      4. Merge, then check the live site with [production-checklist.md](production-checklist.md).
      5. Next.js updates can change APIs. Read the upgrade notes first.

## When changing the app

- Database changes go in a **new** file in `supabase/migrations/` that only
  adds or updates (never drops data), tested locally first, then run once in
  the Supabase SQL Editor **before** deploying the app that needs it.
- Changing `public/sw.js`: bump its `VERSION`.
- Never commit `.env.local` or any key. Never add a service-role or secret key
  to Vercel.
- If a deploy goes wrong: Vercel → Deployments → previous deployment →
  **Promote to Production**.
