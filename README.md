# belle’s life system

**Your life. Your system.**

A calm, Kaizen-inspired personal productivity workspace, based on Ruri Ohama’s Kaizen method and designed to keep visual and mental clutter low. It replaces a Notion template with a faster, cleaner interface built around one daily highlight, four kinds of work (sprints), quick capture and small daily improvements.

> **Phase 1 — Foundation, design system & dashboard.** Everything runs on sample data in the browser. Nothing is saved: changes reset when you refresh.

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
| `N`           | Quick capture to Brain Dump |
| `⌘K` / `/`    | Search                    |
| `[`           | Collapse / expand sidebar |
| `?`           | Show shortcuts            |

---

## Tech stack

- **Next.js 16** (App Router, Cache Components) + **TypeScript**
- **Tailwind CSS v4** with design tokens in `src/app/globals.css`
- **shadcn/ui** components (Radix primitives) in `src/components/ui`
- **Lucide** icons, **Manrope** font, **Sonner** toasts

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
│   ├── pages/                # Client components for every other page
│   └── shared/               # Reusable pieces: TaskRow, SprintBadge, ProjectCard, ProgressRing…
├── data/
│   ├── sprints.ts            # The four sprints + their colours
│   ├── capture-kinds.ts      # Task / Idea / Reminder / Note
│   └── mock-workspace.ts     # Sample data, generated relative to today
├── lib/
│   ├── store/workspace-store.tsx  # In-memory store + actions (swap for Supabase in Phase 2)
│   ├── selectors.ts          # Derived data: today’s tasks, project progress…
│   ├── date.ts               # Local-date helpers (no time zone surprises)
│   └── use-today.ts          # Viewer’s local date, hydration-safe
└── types/index.ts            # Domain model — each type maps to a future table
```

### How data flows

- `WorkspaceProvider` (in the app shell) builds the sample workspace from the viewer’s local date and exposes `useWorkspace()` → `{ workspace, actions }`.
- Pages and components only read through `useWorkspace()` and the selectors, and only write through `actions` (e.g. `toggleTask`, `addCapture`, `setHighlight`).
- In Phase 2 these actions become Supabase calls. Components shouldn’t need to change.

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

## Phase 1 — what’s included

- Responsive app shell: collapsible desktop sidebar, mobile drawer, top bar with page title, date, search, Quick Add and profile menu
- **Today dashboard:** welcome header with progress, Today’s Highlight (with a start/pause focus timer), Micro-Commitments, Brain Dump quick capture, four Sprint cards, Daily Progress and Active Projects
- Layouts for **Brain Dump, Sprints, Tasks, Projects, Calendar, Kaizen Log, Micro-Commitments, Weekly Review, Time Estimation and Preferences**
- Working in-memory interactions: tick off tasks and commitments, capture from anywhere (`N`), choose the highlight, turn captures into tasks, move tasks between sprints, filter tasks, search, browse the calendar
- Calm, guilt-free language: “carried over” instead of “overdue”, no streaks to protect

## Phase 2 — suggested next steps

1. **Supabase setup:** tables matching `src/types`, row-level security, typed client
2. **Authentication:** a private, single-user sign-in (email magic link)
3. **Persistence:** replace `workspace-store.tsx` actions with Supabase queries and mutations (optimistic updates)
4. **Create & edit forms:** tasks, projects, commitments (title, sprint, project, dates, estimate)
5. **Kaizen Log & Weekly Review saving**, with today’s entry generated automatically
6. **Recording actual time:** save focus-timer sessions to `actualMinutes` so Time Estimation fills itself in
7. **Carry-over logic:** move unfinished tasks into today at midnight, as set in Preferences
8. **Recurring tasks** and micro-commitment schedules (e.g. weekdays only)
9. **Notion import:** one-off import of existing Kaizen entries (CSV/Markdown export)
10. **Dark mode** and saving preferences
11. **Drag and drop** on the Sprints board
12. Later: calendar sync (Google/Apple), PWA install + offline capture, reminders
