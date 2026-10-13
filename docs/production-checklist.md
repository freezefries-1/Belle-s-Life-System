# Checking the live site

Everything below was tested automatically against a local copy of the app
and database. The live site (<https://belle-life-system.vercel.app>) can only
be checked by you, because the development environment can't reach it. It
takes about 20 minutes. Use a **test account** for anything that adds or
deletes data, not your real one.

Tick each item. If one fails, note what you saw and which device and browser.

## Before you start

- [ ] Vercel → Deployments: the latest deployment of `main` is **Ready**, and
      GitHub → Actions shows a green run for that commit.
- [ ] Supabase: both files in `supabase/migrations/` have been run (see
      [supabase-setup.md](supabase-setup.md)). The restore feature needs no
      new database changes.
- [ ] Supabase and Vercel settings in [security.md](security.md) → "Settings to
      confirm".

## 1. Security headers (any computer)

- [ ] Open <https://securityheaders.com>, enter the site address and **Scan**.
      Expect an **A** grade, with `X-Frame-Options`, `X-Content-Type-Options`,
      `Referrer-Policy`, `Permissions-Policy` and `Strict-Transport-Security`
      present. (A missing full Content-Security-Policy is expected. See
      security.md.)

## 2. Sign-in (private/incognito window)

- [ ] Opening `/tasks` while signed out goes to the sign-in page.
- [ ] Wrong password shows an error. Right password signs in.
- [ ] **Forgot password?** sends an email. Its link opens the site and lets
      you set a new password.
- [ ] Sign out → you're back at sign-in, and `/tasks` redirects again.

## 3. Everyday use (your real account is fine here)

- [ ] Add a task, complete it, reopen it. The sync indicator shows saved.
- [ ] Capture a Brain Dump thought, then turn it into a task.
- [ ] Set today's Highlight. Tick a Micro-Commitment.
- [ ] Reload the page: everything is still there.
- [ ] Open the site on a second device: the same data appears (within about
      30 seconds, or straight away when you switch back to the tab).

## 4. Backup and restore (test account)

1. [ ] Create a test account (or use one) and load the sample data
       (Preferences → Your data → Load sample).
2. [ ] **Download a backup.**
3. [ ] Delete one task, and edit another task's title.
4. [ ] **Restore from a backup file** → choose the backup. The preview shows
       Tasks: 1 to be added.
5. [ ] Confirm and restore: "Restore complete and checked — 1 record added".
       The deleted task is back, and the edited title is unchanged.
6. [ ] Choose the same file again: "Everything in this backup is already in
       your account".
7. [ ] Choose a different file (any photo or document): it's refused.
8. [ ] Afterwards, delete the test account's data (Preferences → Delete all
       data in your account, type DELETE), or delete the user in Supabase.

## 5. Phone

- [ ] Add to Home Screen ([install-on-phone.md](install-on-phone.md)). The
      app opens full screen, with its icon and name.
- [ ] Bottom bar: Today, Tasks, Brain Dump, Projects and More all work.
- [ ] Typing in a field doesn't zoom the page. The keyboard doesn't cover the
      field.
- [ ] Airplane mode, then open the app: you see "You're offline". Back online,
      it loads.

## 6. Crash reports

- [ ] Vercel → Logs, search `client-error`. Usually empty. If anything is
      there, see [monitoring.md](monitoring.md).

## Done

When every box is ticked, the live site matches what was tested locally.
Record the date here: ____________
