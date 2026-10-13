# Performance — measured results

Measured on 13 October 2026 (Phase 8C) against a local production build
(`next build && next start`), browser-only mode. Lighthouse 12.8 in headless
Chromium. "Mobile" is Lighthouse's default: a mid-range phone with a 4× slower
CPU on throttled 4G. "Desktop" is its desktop preset.

## Page loads (Lighthouse)

| Page | Mobile score | First paint | Main content (LCP) | Blocking time | Layout shift | JS (compressed) |
| --- | --- | --- | --- | --- | --- | --- |
| Today | 76 | 0.9 s | 3.7 s | 520 ms | 0 | 347 KB |
| Tasks | 83 | 0.9 s | 3.6 s | 330 ms | 0 | 340 KB |
| Sprints | 79 | 0.9 s | 3.8 s | 400 ms | 0 | 359 KB |
| Calendar | 88 | 0.9 s | 3.6 s | 160 ms | 0 | 335 KB |
| Progress | 87 | 0.9 s | 3.6 s | 210 ms | 0 | 338 KB |
| Brain Dump | 87 | 0.9 s | 3.6 s | 210 ms | 0 | 336 KB |

| Page | Desktop score | First paint | Main content (LCP) | Blocking time | Layout shift |
| --- | --- | --- | --- | --- | --- |
| Today | 99 | 0.3 s | 0.8 s | 0 ms | 0 |
| Tasks | 100 | 0.3 s | 0.7 s | 10 ms | 0 |
| Sprints | 99 | 0.3 s | 0.8 s | 30 ms | 0 |

No layout shift anywhere (CLS 0).

## Interactions (phone-sized, 4× slower CPU, sample week loaded)

| Action | Time |
| --- | --- |
| Switch page from the bottom bar (repeat visits) | Brain Dump ~0.4 s · Projects ~0.45 s · Today ~0.6 s · Tasks ~0.65 s |
| First visit to a page (its code downloads once) | up to ~1 s |
| Tick a task complete | ~0.35 s |
| Open Quick Add | ~0.4 s |
| Capture into Brain Dump | ~0.2 s |

A real current iPhone is several times faster than this throttled setting.

## Data size (sync engine)

With 20,000 tasks and three years of commitment history, saving an edit in
cloud mode takes about 30 ms to work out what changed (it was about 460 ms
before Stage D). Opening the app fetches only changes since the last visit
(Stage C device copy).

## What the numbers say, and what was (not) changed

- **Main content (LCP) ~3.6 s on throttled mobile** is the time for the app's
  JavaScript to run and draw your data. Your data lives in your account and
  on the device, not in the server's HTML, so it can't appear before the app
  has started. An experiment that put each page's real title into the first
  HTML did not change LCP (the largest text is the page content itself), so
  it was not kept.
- **JavaScript (~340 KB compressed, the same on every page)**: React (~72 KB),
  Supabase's client (~66 KB — needed straight away for sign-in and sync) and
  the UI primitives. Drag and drop (~16 KB) already loads only on Sprints.
- **CPU profile of opening Tasks**: most time is the browser's own work
  (parsing the page's code, layout). No single hotspot in the app's code.
- Not changed, because no measurable benefit was found: lazy-loading more
  components, moving pages to server rendering (data is client-side by design).

## How to re-measure

```bash
npm run build && npm run start   # in one terminal
npx lighthouse http://localhost:3000/tasks --only-categories=performance          # mobile
npx lighthouse http://localhost:3000/tasks --only-categories=performance --preset=desktop
```

Vercel's dashboard also shows real-visit numbers if Speed Insights is ever
turned on (not enabled — it's an extra service).
