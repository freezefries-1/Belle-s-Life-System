# Monitoring and automatic checks

Everything here is free and uses only Vercel and GitHub, which you already
have. No extra service, account or key.

## Crash reports (Vercel logs)

If a page crashes, or the app hits an unexpected error, the browser sends a
short report to the app's own server (`/api/client-error`), which writes one
line to the Vercel logs.

**To read them:** Vercel → your project → **Logs**, then search
`client-error`. A line looks like:

```
[client-error] {"source":"page","name":"TypeError","digest":"1234567","path":"/tasks","frames":["at TaskRow (…/chunks/abc.js:1:2050)"],"at":"2026-10-13T09:00:00.000Z"}
```

| Field | Meaning |
| --- | --- |
| `source` | `page` (a page crashed and showed "Something went wrong"), `app` (the whole app crashed), `window` / `promise` (an error outside a page) |
| `name` | The kind of error, e.g. `TypeError` |
| `digest` | The "Reference" code shown on the error screen. Match it to what you saw |
| `path` | The page, without anything after `?` or `#` |
| `frames` | Where in the code it happened |

**What's never sent:** the error message (it could quote something you typed),
task or note text, your email, or the page's query string. The server
re-checks every report and logs only these fields.

Limits: at most 5 reports per page load, each distinct crash once. Being
offline isn't reported. On the free Vercel plan, logs are kept for a short time
(about an hour to a day). Look soon after a problem.

Server errors (rare, as the app mostly runs in the browser) appear in the same
**Logs** view automatically.

## Automatic checks on GitHub (CI)

`.github/workflows/ci.yml` runs on every push and pull request:

1. `npm ci` (a clean install from the lock file, as Vercel does)
2. lint, 3. type check, 4. unit tests, 5. a production build.

See the results in GitHub → **Actions**, or the ✓ / ✗ next to each commit.
A ✗ means don't merge until it's fixed. It uses no secrets and never touches
Supabase or Vercel.

Not in CI (they need the local Supabase test stack): the database security
tests (`npm run test:db`) and the browser tests (`npm run test:e2e`). Run those
locally before larger changes. See [tests/e2e/README.md](../tests/e2e/README.md).

## Uptime

Not set up (it would need another service). The simplest check is the app
itself: if it can't reach the server, it says so. For outages, see
<https://status.supabase.com> and <https://www.vercel-status.com>.
