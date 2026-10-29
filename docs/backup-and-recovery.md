# Backups and recovery

Your data lives in your Supabase project (the **Free** plan). This page covers
how to keep a copy you control, and what to do if something goes wrong.

## What Supabase Free does and doesn't give you

- **No automatic backups you can use.** Free projects have no downloadable
  backups and no point-in-time recovery. Don't count on Supabase to bring back
  something you deleted.
- **Pausing.** A Free project with low activity for about 7 days is paused
  (Supabase emails a warning first). Nothing is deleted. See "The app says it
  can't reach the server" below.
- **Pro** (paid) adds daily backups kept for 7 days and no pausing. It's a
  billing switch in Supabase. Nothing in the app needs to change.

So **your backup file is the backup.**

## The habit: download a backup every week

1. Open **Preferences → Your data → Download a backup**.
2. You get `belles-life-system-backup-YYYY-MM-DD.json`, containing every task,
   Brain Dump entry, focus session, highlight, commitment (and its history),
   Kaizen Log, project, milestone, recurring task, weekly review, student,
   stage and lesson note, with
   every id and link.
3. Keep it somewhere that isn't only your phone: iCloud Drive, Google Drive or
   email it to yourself. Keep the last few.

The file is plain text and includes everything you wrote. Treat it like a
private document.

## Restoring from a backup

**Preferences → Your data → Restore from a backup file** (signed in only).

1. **Choose file** and pick a backup. Anything that isn't a belle's life system
   backup (or comes from a newer version of the app) is refused, and nothing
   changes.
2. A **preview** compares the file with your account. For each kind of record
   it shows how many are in the backup, how many are already in your account,
   and how many will be added.
3. Tick the confirmation and press **Add N missing records**.
4. The app adds them, then checks every added record and link is there.

What it will and won't do:

- **Only adds what's missing.** A record already in your account is left
  exactly as it is, even if the backup has an older or different version. A
  day that already has its Highlight or Kaizen Log, or a week that already has
  its review, keeps the account's one.
- **Never deletes anything.** Records you created after the backup stay.
- **Safe to repeat.** Running it again adds nothing. If it's interrupted,
  press **Try again**: it compares again and adds only what's still missing.
- It's a way to **bring back** things, not to **roll back** changes. If you
  edited a task after the backup, the edit stays. To undo an edit, change it
  back by hand using the backup file as a reference.

## What to do when…

**You deleted something by mistake.** Restore from your latest backup. Only
the missing records come back.

**You're moving to a new phone or computer.** Nothing to move: install the app
([docs/install-on-phone.md](install-on-phone.md)) and sign in. Everything is
in your account.

**The app says it can't reach the server, on every device.**
1. Check <https://status.supabase.com>.
2. In the Supabase dashboard, if the project says **Paused**, press
   **Restore project**. It takes a few minutes. Nothing is lost, and you have
   up to a year to do it.
3. Changes you made while it was unreachable are kept on that device and
   saved once it's back. Don't sign out of that device until they're saved,
   because signing out removes the device's copy.

**You can't sign in (forgotten password).** Use **Forgot password?** on the
sign-in page. If the email doesn't arrive, Supabase's built-in sender is
limited to a few emails an hour. Wait and try again, or set a new password
in **Supabase → Authentication → Users**.

**The Supabase project itself is lost (deleted, or the account is gone).**
1. Create a new project and follow [supabase-setup.md](supabase-setup.md)
   (tables, sign-in settings, Vercel environment variables, redeploy).
2. Create your account in the app.
3. **Restore from a backup file** with your latest backup.

You'll have everything up to that backup.

**A bad update to the app.** Your data isn't affected by app updates. In
Vercel → Deployments, open the previous working deployment and choose
**Promote to Production** (instant rollback). Then report the problem.

**Something looks wrong after syncing on two devices.** The app shows a
conflict banner when two devices changed the same record. Choose which
version to keep. If you're unsure, download a backup first.

## Checking your backup is good

Every few months:

1. Open the backup file in a text editor. It should start with
   `{"schemaVersion"` and contain your recent tasks.
2. In the app, choose it in **Restore from a backup file** and look at the
   preview. Almost everything should be "Already in account". You don't have
   to go ahead.
