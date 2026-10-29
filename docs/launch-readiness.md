# Launch readiness (end of Phase 8, October 2026)

## Verdict

**Ready for personal use, once you've completed the live-site checks.** All
critical functionality, sign-in, database security and data persistence
were tested, against a local copy of the app and database. The live site
itself hasn't been checked from the development environment (it can't reach
it). [production-checklist.md](production-checklist.md) closes that gap and
takes about 20 minutes. Until it's done, treat the live site as **tested
locally, not yet confirmed in production.**

## What was tested

| Area | How | Result |
| --- | --- | --- |
| Everyday workflow | Browser test, 12 steps, each checked in the database | Pass |
| Sign-in and protected pages | Browser tests: redirects, crafted links, sign-out | Pass |
| Account isolation | 57 database checks with two accounts; browser test in app and database | Pass: no cross-account access |
| Row Level Security | Inventory query, 15/15 tables (18/18 after Students) | All on, signed-out visitors read nothing |
| Saving and sync | Cloud suite (96 checks): create/edit/delete every record type, two devices, conflicts, offline, expired session | Pass |
| Backup and restore | Unit tests plus a browser test: deleted records come back, edited ones aren't overwritten, repeat adds nothing, wrong file refused, second account separate | Pass |
| Moving browser data into an account | Earlier phase suites (insert-only, test import, verification) | Pass |
| Phone layout and PWA | 38 mobile checks, 24 offline/install checks, phone browser test | Pass |
| Accessibility | axe and Lighthouse (100 on six pages), keyboard run-through | Pass, with known items below |
| Performance | Lighthouse: desktop 99–100, mobile 76–88 (simulated slow phone) | Acceptable. See [performance.md](performance.md) |
| Security review | Secrets scan, dependencies, headers, error messages | Pass. See [security.md](security.md) |
| Crash reporting | Endpoint and browser tests; checked no typed text is sent | Pass |

## You still need to do

1. Confirm the dashboard settings in [security.md](security.md) → "Settings to confirm".
2. Run [production-checklist.md](production-checklist.md) on the live site.
3. Start the weekly backup habit ([backup-and-recovery.md](backup-and-recovery.md)).

## Known issues and limits

**Data and recovery**
- Supabase Free has no automatic backups. Your weekly download is the backup.
- Restore adds missing records only. It can't undo an edit (by design: it
  never overwrites).
- Restore works when signed in. Browser-only mode (no Supabase) has backup
  download but no file restore.
- A Free project pauses after about a week of low use. Restoring it is one
  click in Supabase, and nothing is lost.

**Not tested**
- On the live site, by an automated test (see above).
- With VoiceOver, TalkBack or NVDA by a person.
- On a real iPhone and Android phone by a tester. Phone sizes were emulated.
  The phone part of the production checklist covers this.
- Load or scale beyond one person's use (not needed for a personal app).

**Product limits** (unchanged; full list in the README's "Known limitations")
- Sync is every 30 seconds and on focus, not instant.
- No reminders, notifications or external calendar sync.
- No offline mode beyond keeping unsaved changes on the device.
- Sign-in is email and password only. There's no in-app account deletion
  (delete the user in Supabase).

**Development tools**
- Two dev-only dependency advisories (Vitest, eslint-config-next). They don't
  affect the app. Explained in [security.md](security.md).

## Monitoring and upkeep

- Crash reports: Vercel → Logs → `client-error` ([monitoring.md](monitoring.md)).
- Automatic checks on every push: GitHub → Actions.
- Weekly, monthly and quarterly tasks: [maintenance.md](maintenance.md).
