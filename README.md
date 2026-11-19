# FalkorDB Pulse

**The pulse of FalkorDB** — an internal, Google-SSO-gated business-metrics dashboard.
Track GitHub (stars / forks / issues / watchers / traffic), PyPI downloads, Docker Hub
pulls, DB-Engines ranking, and manual social metrics — accumulated **daily over time**,
with aggregations like cumulative sum, daily delta, and rolling averages. Every employee
gets their own customizable dashboards. Data and per-user layout are stored in **FalkorDB**
itself (yes, we dogfood).

<p align="center"><em>Next.js 15 · Auth.js v5 · FalkorDB · Recharts · react-grid-layout · deploys to Vercel</em></p>

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Metric sources](#metric-sources)
- [Local development](#local-development)
- [Deployment (Vercel + FalkorDB Cloud)](#deployment-vercel--falkordb-cloud)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [CI / CD](#ci--cd)
- [Security notes](#security-notes)

---

## Features

- 🔐 **Google sign-in, domain-locked** — only accounts on `ALLOWED_EMAIL_DOMAIN`
  (default `falkordb.com`) can get in.
- 🧩 **Per-user dashboards** — each person builds their own set of dashboards with a
  drag-and-resize grid; layout and configuration are saved server-side and restored on
  the next visit.
- 📈 **Metrics over time** — a daily collector snapshots every source so you see trends,
  not just today's number. Each widget can aggregate its series (cumulative sum, daily
  delta, 7/30-day rolling average, raw, latest…).
- 🔌 **Extensible plugin architecture** — adding a new metric source is one file.
- ⏳ **Historical backfill** — GitHub star/fork history is reconstructed from each
  stargazer's `starred_at` and each fork's `created_at`, so charts have a past, not just
  a future.
- 🎨 **Accessible, themed charts** — light/dark, colorblind-safe palette, Recharts.
- 🪶 **Self-hosted on FalkorDB** — the graph stores users, dashboards, widgets, sources,
  and the full metric time-series.

## Architecture

```
Browser ──▶ Next.js (App Router, TS)
             ├─ Auth.js v5  (Google OAuth, hosted-domain + domain check)
             ├─ /api/*      (dashboards, widgets, sources, metrics, collect…)
             └─ Collector   (adapter registry → daily snapshots)
                   │
                   ▼
              FalkorDB  (graph database — dogfooded)
```

**Graph data model**

```
(:User)-[:OWNS]->(:Dashboard)-[:HAS]->(:Widget)-[:SHOWS]->(:Source)-[:MEASURED]->(:Datapoint)
```

- `User` — keyed by email (the stable identity).
- `Dashboard` / `Widget` — per-user layout + widget config (viz, metric, aggregation, range, x/y/w/h).
- `Source` — a configured metric source instance (shared org-wide; collected once).
- `Datapoint` — one metric value per source per UTC day. The accumulating time-series.

**The plugin registry** lives in [`src/lib/metrics/`](src/lib/metrics). Every source type is a
`SourceTypeDef` ([`adapter.ts`](src/lib/metrics/adapter.ts)) that declares its config fields,
its metrics, a `collect()` (and optional `backfill()`), and is registered in
[`registry.ts`](src/lib/metrics/registry.ts). The UI reads the registry via `/api/source-types`
to render the "add source" and "add widget" flows — so **a new source automatically appears in
the UI** with no front-end changes.

### Add a new metric source

1. Create `src/lib/metrics/adapters/<name>.ts` exporting a `SourceTypeDef`.
2. Register it in `src/lib/metrics/registry.ts`.

That's it — the collector, the API, and the UI pick it up automatically.

## Metric sources

| Type | Metrics | Historical backfill |
|------|---------|---------------------|
| `github_repo` | stars, forks, open issues, watchers, views, unique visitors, clones | ✅ stars + forks (reconstructed); views/clones = last 14 days (needs a push-access token) |
| `pypi_package` | downloads (daily) | ✅ ~180 days of real daily history from pypistats on every collect |
| `dockerhub_image` | pulls (cumulative), stars | Snapshotted daily (Docker Hub exposes only the current total) |
| `dbengines_system` | DB-Engines score, overall rank | Snapshotted daily (updates monthly) |
| `social_manual` | value | Manual entry — LinkedIn/Twitter mention/follower APIs are paywalled/restricted; v2 will automate |

## Local development

**Prerequisites:** Node 20+, Docker (for a local FalkorDB).

```bash
# 1. Start a local FalkorDB
docker run -d --name falkordb-dev -p 6379:6379 falkordb/falkordb:latest

# 2. Install deps
npm install

# 3. Configure env
cp .env.example .env.local
#   - AUTH_SECRET:         npx auth secret   (or: openssl rand -base64 32)
#   - AUTH_GOOGLE_ID/SECRET: from Google Cloud Console (see Deployment)
#   - GH_TOKEN (optional): a GitHub token raises rate limits + enables traffic/backfill
#   The FALKORDB_* defaults already point at the local container.

# 4. Run
npm run dev            # http://localhost:3000
```

### Populate data

```bash
npm run seed              # seed real FalkorDB sources (GitHub, PyPI, Docker Hub, DB-Engines)
npm run collect           # run one collection (PyPI alone backfills ~180 real days)
npm run backfill:history  # reconstruct GitHub star/fork history (use a GH_TOKEN!)
```

> `npm run backfill` (no `:history`) generates **synthetic demo data** for local UI work
> only — never run it against production.

You can also collect/backfill from the UI: open **Data sources** → **Collect now** / **Backfill history**.

## Deployment (Vercel + FalkorDB Cloud)

Both have free tiers; the whole thing runs at ~$0.

**1. FalkorDB Cloud** — create a free instance at <https://app.falkordb.cloud>, and note its
host, port, and password.

**2. Google OAuth** — in [Google Cloud Console](https://console.cloud.google.com) → *APIs &
Services → Credentials* → *Create OAuth client ID* (Web application):
- Authorized redirect URI: `https://<your-domain>/api/auth/callback/google`
- (For local dev also add `http://localhost:3000/api/auth/callback/google`.)
- Copy the client ID/secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
- Access is restricted two ways: the Google `hd` hosted-domain hint **and** an app-side
  check that the email ends in `@ALLOWED_EMAIL_DOMAIN`.

**3. Vercel** — import the GitHub repo, then set the [environment variables](#environment-variables)
in *Project → Settings → Environment Variables*. Set `AUTH_URL` to your production URL.

**4. Daily collection** — [`vercel.json`](vercel.json) schedules `/api/collect` at 06:00 UTC.
Set `CRON_SECRET` in Vercel; the platform injects it into the cron request's `Authorization`
header, and the route rejects anything else.

## Environment variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `AUTH_SECRET` | ✅ | Auth.js session encryption secret (`npx auth secret`). |
| `AUTH_GOOGLE_ID` | ✅ | Google OAuth client ID. |
| `AUTH_GOOGLE_SECRET` | ✅ | Google OAuth client secret. |
| `AUTH_URL` | prod | Canonical app URL, e.g. `https://pulse.falkordb.com`. |
| `ALLOWED_EMAIL_DOMAIN` | ✅ | Only this email domain may sign in (default `falkordb.com`). |
| `FALKORDB_URL` | — | Full connection URL (`falkors://user:pass@host:port`). Overrides the parts below. |
| `FALKORDB_HOST` / `FALKORDB_PORT` | ✅* | FalkorDB host/port (*if `FALKORDB_URL` unset). |
| `FALKORDB_USERNAME` / `FALKORDB_PASSWORD` | — | FalkorDB credentials. |
| `FALKORDB_GRAPH` | — | Graph name (default `pulse`). |
| `GH_TOKEN` | — | GitHub token — raises rate limits and enables traffic + star/fork backfill. |
| `CRON_SECRET` | prod | Guards `/api/collect`. On Vercel, set it and the cron is authorized automatically. |

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the dev server. |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Lint. |
| `npm run seed` | Seed real FalkorDB data sources (idempotent). |
| `npm run collect` | Run one collection across all enabled sources. |
| `npm run backfill:history` | Reconstruct historical data (GitHub stars/forks). |
| `npm run backfill` | **Dev-only** synthetic demo data. |

## CI / CD

- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — lint + build on every push and PR.
- [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — deploys to **Vercel
  production when a GitHub Release is published**. Requires repo secrets `VERCEL_TOKEN`,
  `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (the latter two come from `.vercel/project.json`
  after `vercel link`).

## Security notes

- **Domain-locked auth** — non-`@falkordb.com` Google accounts are rejected at sign-in.
- **Cron is secret-guarded** — `/api/collect` requires `CRON_SECRET`; the UI uses a separate
  session-authenticated `/api/refresh`.
- **No secrets in git** — `.env*` is git-ignored; configure secrets in Vercel + GitHub.
- **Social metrics are manual** in v1 — LinkedIn/Twitter mention & follower APIs are
  paywalled/restricted; the architecture supports automating them later.
