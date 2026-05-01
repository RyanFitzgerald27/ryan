# AgentLoft OS

Brokerage operating system — transaction management, agent lifecycle, commissions, recruiting, compliance, and more. Designed to be merged into the AgentLoft product.

## Status

**v0 scaffold (handoff prototype).** This is a starter codebase intended to be handed off to the AgentLoft dev team. Architecture, conventions, data model, and one-to-two fully built domains are in place; the rest are scaffolded with specs.

## Repo layout

```
/api          NestJS + GraphQL (code-first) + Prisma + Postgres
/web          Angular 21 + Tailwind 4 + apollo-angular (mirrors AgentLoft frontend)
/docs         HANDOFF.md, DATA_MODEL.md, ROADMAP.md, INTEGRATION.md
```

## Quick start

```bash
# Backend (terminal 1)
cd api
npm install
docker compose up -d        # Postgres on :5432
npx prisma migrate dev
npm run seed
npm run start:dev           # GraphQL on http://localhost:3000/graphql

# Frontend (terminal 2)
cd web
npm install
npm start                   # http://localhost:4200
```

## Read these first

- [`docs/HANDOFF.md`](docs/HANDOFF.md) — architecture, conventions, how this merges into AgentLoft
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — full ERD and field rationale
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — what's built, what's stubbed, priority order
- [`docs/INTEGRATION.md`](docs/INTEGRATION.md) — adapter contracts (MLS, FUB/Sierra, QuickBooks, etc.)

## What's built in v0

- Modular monolith architecture with strict module boundaries
- Core domain: Identity (stub), Org, People, RBAC, Audit
- Full Angular shell matching AgentLoft mid-fi: dark sidebar, three sections (WORK / OPERATIONS / GROWTH / INTELLIGENCE / ADMIN), collapsible parents, role gating, Cmd+K stub
- Empty routes for every nav item

## What's stubbed (with specs)

Everything in OPERATIONS, GROWTH (beyond Website), INTELLIGENCE, and ADMIN. Each module has a `MODULE_SPEC.md` describing scope, models, resolvers, screens, and integrations.
