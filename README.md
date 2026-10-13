# belle’s life system

**Your life. Your system.**

A calm, Kaizen-inspired personal productivity workspace, based on Ruri Ohama’s Kaizen method and designed to keep visual and mental clutter low. It replaces a Notion template with a faster, cleaner interface built around one daily highlight, four kinds of work (sprints), quick capture and small daily improvements.

> **Phase 7 — Supabase, sign-in & cloud sync.** With Supabase configured, everything is saved to your account (Postgres with Row Level Security), you sign in with email and password, and changes appear on every device. Without it, the app saves to this browser exactly as before. See [docs/supabase-setup.md](docs/supabase-setup.md) to turn it on, and [docs/cloud-architecture.md](docs/cloud-architecture.md) for how it works.

---

## Run it locally

You need [Node.js](https://nodejs.org) 20.9 or newer.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

| Command         | What it does                       |
| --------------- | ---------------------------------- |
| `npm run dev`   | Start the dev server with hot reload |
| `npm run build` | Production build (what Vercel runs) |
| `npm run start` | Serve the production build          |
| `npm run lint`  | Lint with ESLint                    |
| `npm run typecheck` | Check types with TypeScript     |
| `npm test`      | Run the unit tests (Vitest)         |
| `npm run test:db` | Database security tests (needs the local Supabase stack) |

### Tests

- **Unit tests** (`tests/unit`, `npm test`): the business rules — dates and time zones, commitments, streaks and consistency, recurring tasks, data validation and upgrades, analytics, the main store change rules, the sync engine's merge and conflict helpers, row mapping, the test-import sample and safe sign-in redirects. They need nothing running and take about a second.
- **Database security tests** (`supabase/tests/db-security.test.mjs`, `npm run test:db`): 54 checks with two real accounts against the local Supabase stack (`supabase/local/start.sh`, then `set -a; source supabase/local/.env; set +a`).
- **Browser suites:** each phase was also checked end to end in a real browser (auth, every record type, two-device sync, conflicts, offline, migration, mobile layouts). Those scripts drove a local test setup and aren't part of the repository.

## Deploy to Vercel

1. On [vercel.com](https://vercel.com), choose **Add New → Project** and import this GitHub repository.
2. Keep the detected defaults (Framework: Next.js) and click **Deploy**.
3. From then on, every push to the production branch redeploys automatically, and other branches get preview URLs.

Without environment variables the app runs in browser-only mode. To turn on sign-in and cloud sync, follow [docs/supabase-setup.md](docs/supabase-setup.md): create a Supabase project, run the SQL in `supabase/migrations/`, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel (see `.env.example`), then redeploy. Never add a service-role or secret key.

## Keyboard shortcuts

| Key           | Action                    |
| ------------- | ------------------------- |
| `N`           | Quick capture to Brain Dump (stays open — Enter after each thought, Esc to close) |
| `/`           | Search                    |
| `Enter`       | Save a capture or task    |
| `Esc`         | Close a dialog            |
| `[`           | Collapse / expand sidebar |
| `?`           | Show shortcuts            |

---

## Tech stack

- **Next.js 16** (App Router, Cache Components) + **TypeScript**
- **Tailwind CSS v4** with design tokens in `src/app/globals.css`
- **shadcn/ui** components (Radix primitives) in `src/components/ui`
- **Lucide** icons, **Manrope** font, **Sonner** toasts
- **dnd-kit** (core + sortable) for accessible drag and drop on the Sprints board
- **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`): Postgres, Row Level Security and email auth, with SQL migrations in `supabase/migrations/`

## Project structure

```
src/
├── app/                      # Routes (one folder per page)
│   ├── layout.tsx            # Root layout: font, metadata
│   ├── global-error.tsx      # Last-resort error screen
│   ├── (workspace)/          # Signed-in pages, sharing the app shell (layout.tsx)
│   │   ├── page.tsx          # Today dashboard
│   │   ├── error.tsx         # "Something went wrong on this page" (sidebar and data stay)
│   │   ├── brain-dump/ sprints/ tasks/ projects/ projects/[id]/ calendar/
│   │   ├── kaizen-log/ micro-commitments/ weekly-review/ time-estimation/ progress/
│   │   └── settings/
│   ├── (auth)/login/ reset-password/   # Sign-in pages
│   └── auth/confirm/         # Email link handler
├── components/
│   ├── ui/                   # shadcn/ui primitives (button, card, dialog…)
│   ├── layout/               # App shell, sidebar, top bar, phone/tablet bottom bar, search, quick add
│   ├── dashboard/            # Today page sections
│   ├── brain-dump/           # Capture form, inbox, entry row, edit dialog
│   ├── tasks/                # TaskItem row, shared task editor, filters, summary, actions menu
│   ├── sprints/              # Kanban board (dnd-kit), columns, Unassigned tray, session planner + session view
│   ├── daily/                # Highlight picker, reflection/notes editor, day history
│   ├── commitments/          # Commitment editor, tick row, management card
│   ├── projects/             # Project card, editor, workspace sections (tasks, milestones, notes), deadline overview
│   ├── recurrence/           # Repeat-rule fields, series editor, Recurring tasks panel
│   ├── review/               # Weekly Review steps: look back, unfinished tasks, reflect, look ahead
│   ├── time/                 # Inline minutes field, session-time allocation dialog
│   ├── analytics/            # Stat tile, simple bar charts, "not enough data" state
│   ├── settings/             # Data controls (backup, sample data, clear)
│   ├── pages/                # Client components for every other page
│   └── shared/               # SprintBadge, ProgressRing, task meta labels…
├── data/
│   ├── sprints.ts            # The four sprints + their colours
│   ├── capture-kinds.ts      # Task / Idea / Reminder / Note
│   ├── sample-data.ts        # Opt-in sample data ("Explore with sample data")
│   └── legacy-projects.ts    # The four former preview projects (used by the v4 migration and sample data)
├── lib/
│   ├── storage/              # localStorage wrapper, versioned schema + validation, repository
│   ├── tasks/                # Task model, filter/sort/summary queries, sprint-board helpers (order, progress)
│   ├── sessions/             # Session model: timestamp-based timer, start/pause/end, summaries
│   ├── daily/                # Commitment scheduling + streaks; highlight, log and day-summary helpers
│   ├── brain-dump/           # Capture model
│   ├── projects/             # Project/milestone model, progress, deadline status, deadline overview items
│   ├── recurrence/           # Repeat rules, occurrence generator
│   ├── calendar/             # Derived calendar items
│   ├── review/               # Weekly review model, week summary, unfinished-at-week-end, insights
│   ├── analytics/            # Commitment consistency, time estimation stats, focus stats, trends
│   ├── store/workspace-store.tsx  # Single source of truth: applies changes, saves via the repository
│   ├── store/changes/        # The rules for every change, as plain functions (tasks, daily, projects, recurring, reviews)
│   ├── selectors.ts          # Project progress, inbox…
│   ├── date.ts               # Local-date helpers (no time zone surprises)
│   └── use-today.ts          # Viewer’s local date, hydration-safe
├── proxy.ts                  # Refreshes the auth session; signed-out visitors go to /login (cloud mode only)
├── lib/supabase/             # Browser/server clients, config, proxy session helper
├── lib/repositories/         # Cloud repository, sync engine, row mappers, local-data migration
├── lib/auth/                 # Account context, sync status, safe redirects
├── components/auth/          # Login + reset-password forms
├── components/cloud/         # Cloud workspace provider, sync indicator and banner
├── types/supabase.ts         # Generated from the database schema (supabase/local/gen-types.sh)
├── types/database.ts         # Supabase row types, derived from the generated ones
└── types/index.ts            # Domain model

tests/unit/                   # Vitest unit tests (npm test)

supabase/
├── migrations/               # Schema, constraints, indexes, RLS, functions (version-controlled)
├── tests/                    # Database security tests (two accounts)
└── local/                    # Local test stack (Docker) — development only
```

### How data flows

- `WorkspaceProvider` (in the app shell) loads saved data through a `WorkspaceRepository` **in the browser only** (no hydration mismatches) and exposes `useWorkspace()` → `{ workspace, actions, storage }`.
- Components read through `useWorkspace()` and the query helpers in `lib/tasks`, and change data only through `actions` (`addCapture`, `convertCapture`, `createTask`, `updateTask`, `toggleTaskComplete`, `deleteTask`…).
- Every action writes through the repository: `localStorageRepository` in browser-only mode, or the cloud repository (Supabase) when it's configured. Both share one interface, so components never touch storage or the database directly.
- **Storage format:** one versioned key, `belles-life-system:v1`, holding `{ schemaVersion, savedAt, data: { tasks, captures, sessions } }`. The current `schemaVersion` is **5**: v5 adds `weeklyReviews` and `weeklyPriorities`, records commitment `pausedPeriods`, milestone `completedAt` and session `allocations` (filled from existing timestamps when upgrading). v4 added `projects`, `milestones` and `recurrences`, plus four task fields (`projectSortOrder`, `milestoneId`, `recurrenceTemplateId`, `occurrenceDate`). v3 added `highlights`, `commitments`, `commitmentCompletions` and `kaizenLogs`, and older data upgrades step by step, with a `pre-vN` backup kept first. Phase 2 (v1) data upgrades automatically: every task keeps its fields and gains a `sortOrder`, and a copy of the old data is kept under `belles-life-system:v1:backup:pre-v2-<time>`. Every record is validated on load. Unreadable records, repeated copies and records linked to something missing are set aside (and counted in the message you see), and a backup copy of the raw value is kept under `belles-life-system:v1:backup:<time>`. Changes made in another tab sync automatically.
- **First run** starts empty. Sample data is only loaded when you choose “Explore with sample data”, and it never overwrites saved data without asking.

### Task rules

| Term        | Meaning |
| ----------- | ------- |
| Active      | Status To Do or In Progress |
| Today       | Due on today’s local calendar date |
| Upcoming    | Active and due after today |
| Overdue     | Active and due before today |
| Unscheduled | No due date |

- Completing a task sets `completedAt`. Reopening it clears `completedAt`.
- Converting a Brain Dump entry creates **one** task (repeat attempts are ignored). The new task stores `sourceCaptureId` and the original `capturedAt`, and the entry leaves the inbox (marked `converted`).
- Deleting a task or entry shows an **Undo** toast.

### Sprint rules

- Tasks are never sorted into a sprint automatically. Brain Dump conversions stay **Unassigned** until you choose.
- Manual order uses `sortOrder`, which is compared only within a sprint. Dragging changes only `sprint` and `sortOrder` (plus `updatedAt` when the sprint changes). Tasks moved with the menu go to the bottom of the new sprint.
- Sprint completion % = completed ÷ all tasks in that sprint. An empty sprint shows "No tasks yet", not 100%.
- Drag-to-reorder pauses while filters or a non-manual sort are on, and the board says so. The ⋯ menu and quick-assign buttons always work.
- **Sessions** reference tasks by id; tasks are never copied. Only one session can be open at a time. Elapsed time = `accumulatedElapsedSeconds` + (now − `lastResumedAt`) while running, so it survives refreshes and background tabs. Ending a session records a snapshot (`completedTaskIds`, actual time) and never moves or reschedules tasks.

### Daily rules

- **Daily Highlight:** one record per local date (`dateKey`, YYYY-MM-DD). It points at an existing task by `taskId`, so completing the highlight completes that task and reopening the task reopens the highlight. There's no separate completion flag. `titleSnapshot` keeps history readable if the task is later deleted. Only today's record ever changes. Yesterday's unfinished highlight is offered as a suggestion, never carried forward.
- **Micro-commitments:** a frequency of **daily**, **selected weekdays**, or **weekly** (once in each Monday–Sunday week, on any day). Completions are separate records, unique per `(commitmentId, dateKey)`, so ticking today never affects another day. Pausing and archiving keep the history; deleting removes it (after confirmation).
- **Streaks** count consecutive *scheduled* days (or weeks, for weekly commitments). Unscheduled days and paused stretches are skipped, and an open today or this week doesn't break a streak. The history dots follow the same rules, so they agree with the consistency figure.
- **Kaizen Log:** one entry per local date, holding only the reflection answers and notes. The highlight, commitments, completed tasks and sessions for that day are read from their own records. Today's entry is created the first time the app opens that day, including after midnight in an open tab or when you return to the tab; no background job is needed. Future dates are read-only and never create records.

### Project rules

- **Progress** = completed ÷ all tasks in the project. A project with no tasks shows "No tasks yet", never 100%. Status (Planning, Active, On Hold, Completed, Archived) is always set by you. Reaching 100% never completes a project on its own.
- **Deadline status** (local dates): Upcoming (more than 7 days away), Approaching (1–7 days), Due today, Overdue, Completed. Completed projects and milestones are never overdue.
- **Start preparing** dates (on projects and milestones) are reminders only. They show in the deadline overview and on the Calendar, and they never create tasks.
- **Deleting** a project keeps its tasks; they just lose the project. Its milestones and notes are removed. Archive keeps everything and can be restored.
- **Upgrading from v3:** tasks linked to the old preview projects keep their link. A real project is created only for each preview project a task actually used.

### Recurring task rules

- Frequencies: daily, weekdays (Mon–Fri), weekly or every two weeks on chosen days, monthly (on the start date's day; the 29th–31st fall on the last day in shorter months), and custom (every N days or weeks).
- Each occurrence is an ordinary task with an id of `rec_<template>_<date>`. Generation runs when the app opens and when the day changes. It creates today's occurrence plus up to 4 upcoming to-do ones within the next 14 days (skipped occurrences don't use up a slot). A new series with a past start date begins today; it doesn't create an overdue task for the past. The template's `generatedThrough` date means a date is never created twice, and deleted occurrences don't come back.
- **Missed dates:** after time away (however long), only the most recent missed occurrence is created (as overdue), not a pile of them.
- **Edit this occurrence** changes one task. **Edit future occurrences** changes the series and its unfinished upcoming occurrences. Completed history is never rewritten.
- Pause stops new occurrences, and resuming doesn't back-fill the gap. End stops after today. Delete removes the rule and keeps completed occurrences as normal tasks. Removing upcoming unfinished occurrences is an optional checkbox.
- The Calendar also shows planned future dates that haven't been generated yet (dashed). Nothing is stored for them.

### Weekly review rules

- Weeks run Monday–Sunday in local time. There's **one review per week**, keyed by its Monday. Opening a week creates nothing; the record appears with your first answer, priority or status change. "Not started" simply means there's no record yet.
- Only your words and priorities are stored. Every number is calculated from tasks, highlights, commitments, sessions and milestones.
- **Unfinished at week end** = due by Sunday, created by then, and not completed by then (using `createdAt`/`completedAt`). For past weeks this is labelled as reconstructed: due dates are today's values and skipped tasks aren't included, since neither change is dated. Nothing is rescheduled automatically.
- Up to **three priorities** for the coming week, linking a task or project or written as free text. Linking never creates a task. If a linked task or project is deleted, the link is cleared and the title stays.
- A review is Completed only when you mark it, whatever is filled in, and it can be reopened.

### Time rules

- Tasks keep `estimatedMinutes` and `actualMinutes` (both optional). **Difference = actual − estimated**, calculated only when both exist. Missing values are left out and never treated as zero, and every statistic shows how many tasks it's based on.
- **Focus time comes from sessions only**, using actual elapsed time, not the plan. A session can include several tasks, so its time isn't copied to them automatically. You can **allocate** a session's minutes to its tasks: that adds to their actual time, the total can't exceed the session, and editing an allocation changes each task by the difference. Focus totals never include allocated or manual minutes, so nothing is counted twice.
- Patterns ("You tend to underestimate Admin & Life tasks") appear only with at least 5 comparable tasks overall, or per Sprint for Sprint patterns.

### Progress rules

- One date range (7, 30 or 90 days, or custom) applies to every metric on the page.
- **Commitment consistency** counts scheduled opportunities only: scheduled days for daily and weekday commitments, Monday–Sunday weeks for weekly ones. Unscheduled days, days before the start, paused stretches and days after archiving never count as missed. Today (or this week) counts only once it's done. Only ticks inside the selected range count; a week cut by the range's edge that was ticked just outside it is left out.
- Project progress is current only. Past snapshots aren't stored, so there's no invented history.

### Design tokens

Colours live as CSS variables in `globals.css` and are exposed to Tailwind (`bg-ink`, `text-ink-muted`, `bg-sprint-urgent`, …):

| Token            | Value     | Use                         |
| ---------------- | --------- | --------------------------- |
| `ink`            | `#101827` | Sidebar, highlight panel    |
| `ink-2`          | `#1E293B` | Raised dark surfaces        |
| `primary`        | `#2563EB` | Primary actions             |
| `primary-hover`  | `#3B82F6` | Hover accent                |
| `background`     | `#F8FAFC` | Workspace                   |
| `card`           | `#FFFFFF` | Cards                       |
| `ink-border`     | `#334155` | Borders on dark surfaces    |

---

## Phase 7 — what’s included

- **Supabase schema** (`supabase/migrations/20261012000000_initial_schema.sql`):
  - 13 user-owned tables plus profiles and sync tombstones;
  - composite `(user_id, id)` keys that keep existing ids;
  - ownership-aware foreign keys (no cross-account links);
  - `date` vs `timestamptz` used properly;
  - uniqueness for highlights, commitment ticks, weekly reviews, recurring occurrences and the one open session;
  - indexes, version and sync triggers, and RLS on everything.
- **Auth:**
  - email + password sign-in, account creation, and password reset by email;
  - protected routes through `src/proxy.ts`;
  - sessions that persist across refreshes and refresh themselves when they expire;
  - sign-out that clears all in-memory data.
- **Cloud data layer:**
  - the same store and actions as before, now saving row-level changes through a transactional `apply_changes` function;
  - versioned concurrency, so stale edits are reported and never silently overwritten;
  - automatic handling of routine multi-device cases;
  - incremental sync on focus, on reconnect and every 30 s;
  - a copy on the device, so opening the app only fetches what changed (deleted on sign-out);
  - a sync indicator, offline and error banners with Retry, and a load-error screen.
- **Migration:**
  - a backup download, a preview, and explicit confirmation;
  - a test import of a small sample first, with every kind of link read back and checked;
  - an insert-only, retryable import that preserves ids, timestamps and links;
  - verification afterwards;
  - local data kept until you choose to clear it.
- **Tasks page:** long lists render 100 at a time.
- **Tests:** database security checks with two real accounts (`npm run test:db`), plus end-to-end browser checks run during development (see **Tests** near the top).

## Phase 6 — what’s included

- **Weekly Review** (`/weekly-review?week=YYYY-MM-DD`): week navigation, a status badge and review history. Three steps you can move between freely:
  - **Look back:** week numbers, short factual insights, completed tasks, highlights, commitment consistency, current project progress, and unfinished tasks you can open, re-date, re-sprint or complete.
  - **Reflect:** five optional questions that save as you type.
  - **Look ahead:** up to three priorities.
- **Time Estimation:**
  - accuracy stats (average and median difference, % that took longer, average estimate and actual), each with its task count;
  - planning patterns, or "Not enough data yet";
  - an editable log (estimate, actual, difference, accuracy) with filters;
  - session-time allocation.
- **Progress** (`/progress`):
  - range picker and six overview metrics;
  - tasks-completed chart (daily or weekly) and Sprint distribution;
  - commitment consistency with a weekly trend;
  - focus sessions (total, count, average, planned vs actual, by Sprint);
  - active project progress.
- **Today:** a small "This week" card (tasks, highlights, commitments, focus time) with a link to the Weekly Review.

## Phase 5 — what’s included

- **Projects page:** status filters (Active, Planning, On Hold, Completed, Archived), sorting (target date, name, recently updated, progress) and an upcoming deadlines overview covering project deadlines, milestones, "Start preparing" dates and overdue items.
- **Project workspace** at `/projects/<id>`:
  - header with status (changeable inline), priority, target date with deadline status and days remaining, preparation date and progress ring;
  - stats; Edit, Archive/Restore, and Delete (tasks kept);
  - tasks: add, link existing, drag to reorder, complete/reopen, remove from project;
  - milestones: checklist with status, reorder, prep dates and task links;
  - plain-text notes that autosave.
- **Task editor:** project and milestone pickers, plus **Repeat…** to make a recurring task.
- **Tasks → Recurring:** view, edit, pause, resume, end or delete each series.
- **Calendar:** month and list views showing task due dates, recurring occurrences, planned repeats, project deadlines, milestones and preparation dates, each with a distinct marker. Clicking an item opens the task, series or project.
- **Today:** real Active Projects plus an Upcoming deadlines card. Project and recurring tasks can be the Daily Highlight.
- Search results open the project page.

## Phase 4 — what’s included

- **Today's Highlight:**
  - Pick an open task, or type a new one, as today's single priority.
  - Change or remove it, edit the task, tick it complete (this completes the real task), or plan a focus session for it.
  - If yesterday's highlight is unfinished, it's offered with one tap, never added automatically.
- **Micro-Commitments page:**
  - Create and edit commitments (title, description, target time, every day / selected days / once a week, start date).
  - Pause, resume, archive, restore and delete them.
  - Tick or untick today. Each card shows the last 14 days (or 8 weeks), "Done X of the last Y scheduled days" and a gentle streak.
  - When the list is empty, one-tap suggestions help you start.
- **Kaizen Log:**
  - Previous / Today / Next controls and a date picker.
  - Each day shows its highlight, commitments (tickable, including past days), completed tasks and focus sessions, three optional reflection prompts and free-form daily notes, all saved as you type.
  - A "Recent days" history shows highlight, task, commitment and reflection indicators.
- **Today page:**
  - The highlight card, today's commitments with tick boxes, and a reflection shortcut.
  - Daily Progress shows tasks completed, highlight status, commitments done and tasks still due as separate numbers, not blended into one score.
  - The date rolls over correctly in an open tab.

## Phase 3 — what’s included

- **Sprints board:**
  - Four columns, each with an icon, description, active and completed counts, time remaining, progress % and next deadline.
  - Add Task in every column, and a collapsible Completed section.
  - On phones, the columns become tabs.
- **Drag and drop (dnd-kit):** move tasks between sprints and reorder within a sprint using the grip handle, with mouse, touch or keyboard (space to pick up, arrow keys to move, space to drop). The new order saves automatically.
- **Other ways to organise:** the ⋯ menu's **Move to sprint** and one-tap **Assign 1-2-3-4** buttons on unassigned tasks, so dragging is never required.
- **Unassigned tray:** a count, the task list, quick assign, and click a title to open the task.
- **Filters and sorting:** status, priority, due date and project; Manual order (default), due date, priority or shortest first.
- **Plan a session:**
  - An optional energy check-in shows gentle guidance only.
  - Pick a sprint, a length (15, 30, 45, 60 or 90 minutes, or custom) and some tasks. It shows the combined estimate and a soft warning if the tasks may need more time.
  - The session page has Start, Pause and Resume, tick-off controls and progress. Ending it shows a summary of planned vs actual time and completed vs remaining tasks.
  - Sessions survive a refresh, and a history of finished sessions is kept.
- **Today:** a current-session widget with a Resume button. Sprint cards show the active count, next deadline and progress, and link to that sprint on the board.

## Phase 2 — what’s included

- **Brain Dump:** one-line capture on Today, the Brain Dump page and the global Quick Add (`N`). Press Enter to save; empty entries can’t be saved. Quick Add stays open so you can add several thoughts in a row. The inbox shows the date captured, a note and a status, with Edit, Convert to task and Delete (with Undo). It also shows an inbox count and an empty state.
- **Tasks:**
  - Create, edit, complete, reopen, skip and delete tasks, all through one shared editor. The editor shows the essential fields first and tucks priority, time, project and status under “More details”.
  - Summary (Active, Due today, Overdue, Completed). Views: All, Today, Upcoming, Unscheduled, Completed.
  - Search covers titles and notes. Filters: status, sprint, priority and due date. Sort by due date, newest, priority or shortest first.
- **Sprint assignment:** from the editor or the ⋯ menu. Tasks can stay unassigned.
- **Dashboard:** the sprint cards, daily progress, header progress ring, inbox count and sidebar badges use real data. Today’s Highlight and Micro-Commitments are labelled **Preview**.
- **Preferences → Your data:** download a JSON backup, load sample data (asks first if you have data), clear all data (asks first).

## Phase 1 — what’s included

- Responsive app shell: collapsible desktop sidebar, mobile drawer, top bar with page title, date, search, Quick Add and profile menu
- **Today dashboard:** welcome header with progress, Today’s Highlight (with a start/pause focus timer), Micro-Commitments, Brain Dump quick capture, four Sprint cards, Daily Progress and Active Projects
- Layouts for **Brain Dump, Sprints, Tasks, Projects, Calendar, Kaizen Log, Micro-Commitments, Weekly Review, Time Estimation and Preferences**
- Working in-memory interactions: tick off tasks and commitments, capture from anywhere (`N`), choose the highlight, turn captures into tasks, move tasks between sprints, filter tasks, search, browse the calendar
- Calm, guilt-free language and no streaks to protect

## Known limitations

- Browser-only mode keeps data in one browser. Cloud mode needs a Supabase project (see the setup guide).
- Cloud mode needs a connection to save. Changes made offline (or when a session expires) are kept on that device with a clear "not saved" banner, and saved when you're back online or signed in again. They live only on that device until then. There's no full offline-first mode.
- Sync is near-real-time: on focus, on reconnect and every 30 s, not instant push. Realtime subscriptions could replace the poll later.
- Recurring occurrences are still generated when the app opens. There's no server-side scheduler.
- Opening the app loads a copy kept on the device and fetches only what changed (with a full download on first sign-in, weekly, or if the copy doesn't match). That copy means your data is stored in the browser while you're signed in; signing out deletes it. Analytics run in the browser over your full history.
- Sign-in is email + password only, and there's no account deletion screen yet (delete the user in the Supabase dashboard).
- Task due-date changes and skips aren't dated, so past weeks' unfinished lists use current due dates and leave out skipped tasks (the page says so). Commitments paused before this update get a pause start of their last edit. Milestones completed before it use their last update as the completion date.
- Charts are deliberately simple. There's no history of project progress, and no export of analytics.
- There are no reminders or notifications for deadlines or preparation dates, and no external calendar sync. Dates are shown inside the app only.
- Recurring occurrences are created when the app is opened. If it isn't opened for a while, only the most recent missed occurrence appears. Projects and milestones can't be duplicated or templated yet.
- Project notes are plain text (no rich formatting or links preview). Milestones reorder with arrow buttons rather than drag and drop.
- On phones you can reorder within a sprint by dragging, but you move tasks between sprints with the menu or quick-assign buttons (one column shows at a time).
- Session time reaches a task's actual time only when you allocate it. The timer doesn't track individual tasks.

## Next phases (suggested)

1. Realtime updates, saved preferences and a profile/account page.
2. Calendar sync, reminders, Notion import, dark mode.
