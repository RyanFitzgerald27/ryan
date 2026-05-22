# Pulse — Brokerage Calls & Conversations Tracker

An internal dashboard for tracking call activity and conversations across the
brokerage, with a per-agent leaderboard. Activity is synced live from the
**Follow Up Boss** API.

This is the MVP (calls & conversations). Company/agent **deals tracking** is the
planned next phase — see the roadmap below.

## Architecture

```
pulse/
├── server/   Node + Express + TypeScript API. Syncs from Follow Up Boss into SQLite.
└── client/   Angular 19 + Bootstrap 5 dashboard.
```

- The **server** owns the Follow Up Boss integration and all metrics. The sync
  layer (`server/src/fub/`) is self-contained so it can later be lifted into the
  AgentLoft backend.
- The **client** is a single-page Angular dashboard, built with Bootstrap to
  stay visually consistent with AgentLoft.
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

The first sync pulls `SYNC_LOOKBACK_DAYS` of history (default 365). Later syncs
are incremental — only calls since the last successful sync are fetched. All
records are upserted by FUB id, so re-syncing never creates duplicates.

## What counts as a "conversation"

A call is counted as a conversation when **either**:

- it lasted at least `CONVERSATION_MIN_SECONDS` seconds, **or**
- its Follow Up Boss outcome is listed in `CONVERSATION_OUTCOMES`.

Outcome names vary per FUB account — edit `CONVERSATION_OUTCOMES` in `.env` to
match the outcomes your team actually uses.

## Roadmap

- **Deals tracking** — company deals and agent deals (pipeline, volume,
  commissions, closed vs. pending).
- **Real Scale** — Real Scale currently only exposes SMTP, so the plan is to
  ingest its emailed reports rather than a live API.
- **AgentLoft integration** — fold the FUB sync layer and metrics into the
  AgentLoft backend so Pulse is reachable from inside AgentLoft.
