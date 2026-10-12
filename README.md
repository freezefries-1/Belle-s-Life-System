# belle’s life system

**Your life. Your system.**

A calm, Kaizen-inspired personal productivity workspace, based on Ruri Ohama’s Kaizen method and designed to keep visual and mental clutter low. It replaces a Notion template with a faster, cleaner interface built around one daily highlight, four kinds of work (sprints), quick capture and small daily improvements.

> **Phase 3 — Sprint management & planning.** Tasks, Brain Dump entries and focus sessions are saved in your browser (localStorage) and survive refreshes. Other sections (projects, habits, calendar, journal, weekly review) still show preview data. Nothing syncs between devices yet.

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

## Deploy to Vercel

1. On [vercel.com](https://vercel.com), choose **Add New → Project** and import this GitHub repository.
2. Keep the detected defaults (Framework: Next.js) and click **Deploy**.
3. From then on, every push to the production branch redeploys automatically, and other branches get preview URLs.

No environment variables are needed in Phase 1.

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

## Project structure

```
src/
├── app/                      # Routes (one folder per page)
│   ├── layout.tsx            # Root layout: font + app shell
│   ├── page.tsx              # Today dashboard
│   ├── brain-dump/ sprints/ tasks/ projects/ calendar/
│   ├── kaizen-log/ micro-commitments/ weekly-review/ time-estimation/
│   └── settings/
├── components/
│   ├── ui/                   # shadcn/ui primitives (button, card, dialog…)
│   ├── layout/               # App shell, sidebar, top bar, mobile drawer, search, quick add
│   ├── dashboard/            # Today page sections
│   ├── brain-dump/           # Capture form, inbox, entry row, edit dialog
│   ├── tasks/                # TaskItem row, shared task editor, filters, summary, actions menu
│   ├── sprints/              # Kanban board (dnd-kit), columns, Unassigned tray, session planner + session view
│   ├── settings/             # Data controls (backup, sample data, clear)
│   ├── pages/                # Client components for every other page
│   └── shared/               # SprintBadge, ProjectCard, ProgressRing, task meta labels…
├── data/
│   ├── sprints.ts            # The four sprints + their colours
│   ├── capture-kinds.ts      # Task / Idea / Reminder / Note
│   ├── sample-data.ts        # Opt-in sample tasks + Brain Dump ("Explore with sample data")
│   └── preview-content.ts    # In-memory preview for later-phase pages
├── lib/
│   ├── storage/              # localStorage wrapper, versioned schema + validation, repository
│   ├── tasks/                # Task model, filter/sort/summary queries, sprint-board helpers (order, progress)
│   ├── sessions/             # Session model: timestamp-based timer, start/pause/end, summaries
│   ├── brain-dump/           # Capture model
│   ├── store/workspace-store.tsx  # Single source of truth + actions, persists via the repository
│   ├── selectors.ts          # Project progress, inbox…
│   ├── date.ts               # Local-date helpers (no time zone surprises)
│   └── use-today.ts          # Viewer’s local date, hydration-safe
└── types/index.ts            # Domain model — each type maps to a future table
```

### How data flows

- `WorkspaceProvider` (in the app shell) loads saved data through a `WorkspaceRepository` **in the browser only** (no hydration mismatches) and exposes `useWorkspace()` → `{ workspace, actions, storage }`.
- Components read through `useWorkspace()` and the query helpers in `lib/tasks`, and change data only through `actions` (`addCapture`, `convertCapture`, `createTask`, `updateTask`, `toggleTaskComplete`, `deleteTask`…).
- Every action writes through the repository. Today that's `localStorageRepository`; a Supabase repository can implement the same interface later.
- **Storage format:** one versioned key, `belles-life-system:v1`, holding `{ schemaVersion, savedAt, data: { tasks, captures, sessions } }`. The current `schemaVersion` is **2**. Phase 2 (v1) data upgrades automatically: every task keeps its fields and gains a `sortOrder`, and a copy of the old data is kept under `belles-life-system:v1:backup:pre-v2-<time>`. Every record is validated on load. Unreadable records are skipped and a backup copy of the raw value is kept under `belles-life-system:v1:backup:<time>`. Changes made in another tab sync automatically.
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

- Data lives in one browser on one device. Clearing site data removes it, so use **Download a backup**. There's no import yet.
- Projects are a fixed list of four. Tasks can link to them, but projects can't be created or edited yet.
- Highlight, Micro-Commitments, Calendar events, Kaizen Log and Weekly Review are still previews and aren't saved.
- On phones you can reorder within a sprint by dragging, but you move tasks between sprints with the menu or quick-assign buttons (one column shows at a time).
- Session time isn't yet copied into a task's "actual time". Time Estimation and Weekly Review will use the session history in later phases.
- The Today's Highlight card still has its own preview timer, separate from Sprint sessions.
- Recurring tasks come in a later phase.

## Next phases (suggested)

1. **Phase 4:** Daily Highlight selection, saved per day.
2. Micro-Commitment tracking, Kaizen Log and Weekly Review saving (session history is already stored for Time Estimation and Weekly Review).
4. Supabase + sign-in, implementing `WorkspaceRepository` (with a one-time import from localStorage).
5. Projects CRUD, recurring tasks, calendar sync, Notion import, dark mode.
