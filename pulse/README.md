# Pulse — Brokerage Activity & Deals Tracker

An internal dashboard for the brokerage with two areas:

- **Activity** — calls, texts, emails and conversations across the team, with a
  per-agent leaderboard and a unified activity feed.
- **Deals** — company and agent deals: open pipeline by stage, closed volume,
  commission, win rate, and a per-agent leaderboard.

All data is synced live from the **Follow Up Boss** API.

## Architecture

```
pulse/
├── server/   Node + Express + TypeScript API. Syncs from Follow Up Boss into SQLite.
└── client/   Angular 19 + Bootstrap 5 dashboard.
```

- The **server** owns the Follow Up Boss integration and all metrics. The sync
  layer (`server/src/fub/`) is self-contained so it can later be lifted into the
  AgentLoft backend.
- The **client** is an Angular single-page app with two routes — `/activity`
  and `/deals` — built with Bootstrap to stay visually consistent with AgentLoft.
- Data lives in a local **SQLite** file (`server/data/pulse.db`). It sits behind
  a thin data layer (`server/src/db.ts` + `metrics.ts`) so it can be swapped for
  Postgres later with no API changes.

## Prerequisites

- Node.js 20 or newer (uses the built-in `fetch`).
- A Follow Up Boss API key — in FUB go to **Admin → API**.

## Setup

### 1. Server

```bash
cd pulse/server
npm install
cp .env.example .env
```

Open `.env` and set `FUB_API_KEY`. The other values have sensible defaults; the
ones you may want to review:

| Variable                   | Purpose                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `FUB_API_KEY`              | Follow Up Boss API key (required for syncing).             |
| `TIMEZONE`                 | Timezone for "Today / This Week" ranges (default Eastern). |
| `CONVERSATION_MIN_SECONDS` | Min call length to count as a conversation.                |
| `CONVERSATION_OUTCOMES`    | FUB call outcomes that also count as a conversation.       |
| `SYNC_INTERVAL_MINUTES`    | Auto-sync interval; `0` disables it.                       |

### 2. Client

```bash
cd pulse/client
npm install
```

## Running

### Development (two terminals)

```bash
# Terminal 1 — API on http://localhost:4000
cd pulse/server && npm run dev

# Terminal 2 — dashboard on http://localhost:4200
cd pulse/client && npm start
```

The Angular dev server proxies `/api` to the backend (see `proxy.conf.json`),
so just open **http://localhost:4200**.

### Production (single process)

```bash
cd pulse/client && npm run build      # outputs dist/client/browser
cd ../server     && npm run build && npm start
```

When a built client exists, the server serves the dashboard and the API together
on `PORT` (default 4000) — open **http://localhost:4000**.

## Syncing data

You can pull activity from Follow Up Boss three ways:

- **Sync now** button in the dashboard toolbar (runs in the background).
- `npm run sync` in `pulse/server` — a one-shot run, ideal for a cron job.
- Set `SYNC_INTERVAL_MINUTES` to sync automatically while the server runs.

Each sync covers agents, calls, texts, emails, and deals. The first sync of
calls/texts/emails pulls `SYNC_LOOKBACK_DAYS` of history (default 365); later
syncs are incremental. Deals are fully re-synced every run so status changes
(open → won/lost) are always caught. Everything is upserted by id, so re-syncing
never creates duplicates. Texts, emails, and deals are each optional — if a FUB
feature is off or an endpoint is unavailable, that step is skipped and the rest
of the sync still succeeds.

## How the metrics are defined

**Conversations.** A conversation is a meaningful two-way contact within the
range, counted across channels:

- a connected phone call — it lasted at least `CONVERSATION_MIN_SECONDS`
  seconds, **or** its FUB outcome is listed in `CONVERSATION_OUTCOMES`; plus
- each lead who replied by **text** (counted once per lead); plus
- each lead who replied by **email** (counted once per lead).

Outcome names vary per FUB account — edit `CONVERSATION_OUTCOMES` in `.env` to
match the outcomes your team actually uses.

**Deal ranges.** On the **Deals** page, *Open Deals* and *Pipeline Value* are
current totals (every open deal, regardless of the date range). *Deals Won*,
*Volume*, *Commission*, and *Win Rate* cover deals closed within the selected
date range.

## Roadmap

- **Real Scale** — deals also live in Real Scale, which exposes the same
  transactions as FUB. Since Real Scale only offers SMTP, the plan is to ingest
  its emailed reports and de-duplicate against FUB deals (the `deals` table
  already carries `source` + `source_id` for exactly this).
- **AgentLoft integration** — fold the FUB sync layer and metrics into the
  AgentLoft backend so Pulse is reachable from inside AgentLoft.
