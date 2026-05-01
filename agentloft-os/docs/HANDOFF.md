# Handoff guide

This document tells the AgentLoft dev team what's here, why it's structured the way it is, and how to merge it into AgentLoft proper.

## Vision

A **brokerage operating system** built into AgentLoft. Agents already live in AgentLoft; we're adding the operational layer on top of them: transactions, commissions, vendors, recruiting, training, compliance, accounting, reporting, and more.

## Architectural principles

1. **Modular monolith.** One deployable backend, strict module boundaries. Easy for a small team to manage; can split into services later if scale demands it.
2. **Money in cents, percentages in basis points.** No floats. Display layer formats.
3. **Every mutating action emits an `AuditEvent`.** Cross-cutting via Prisma middleware.
4. **Permissions checked at the resolver, not the route.** UI hides what the user can't access; the backend enforces it.
5. **Pure calculation services are pure.** `CommissionCalcService` takes inputs, returns outputs, no DB. Easy to unit-test, easy to reuse from reports.
6. **Modules own their schema.** Each module appends to `schema.prisma` in its own section; the file is divided by module headers.

## Repo layout

```
/api/src
  /core
    /prisma                Prisma client wrapper
    /identity              Auth (stub — replace with AgentLoft's)
    /org                   Brokerage / Office / Team
    /people                Agent / Contact
    /audit                 AuditEvent emitter
  /modules
    /transactions          ✅ FULLY BUILT (reference implementation)
    /agent-lifecycle       🟡 stubbed — see MODULE_SPEC
    /recruiting            🟡 stubbed
    /commissions           🟡 stubbed (calc service lives in /transactions for v0)
    /vendors               🟡 stubbed
    /documents             🟡 stubbed
    /training              🟡 stubbed
    /compliance            🟡 stubbed
    /reporting             🟡 stubbed
/api/prisma
  schema.prisma            Full v0 schema (all modules)
  seed.ts                  ~10 transactions, 8 agents, lead sources, vendors

/web/src/app
  /core
    /auth                  CurrentUserService (stub)
    /nav                   nav.config.ts — single source of truth for sidebar IA
  /shell                   sidebar, topbar
  /features                placeholder route component
  app.routes.ts            every nav item has a route
```

## Core model integration

The `User`, `Brokerage`, `Office`, `Team`, and `Agent` models in this repo are **placeholders**. AgentLoft's product backend already owns these. When merging:

1. Drop our `User`, `Brokerage`, `Office`, `Team`, `Agent` tables.
2. In `schema.prisma`, change the FK references in transaction/commission/etc. tables to point at AgentLoft's existing tables (or, if Prisma doesn't manage AgentLoft's schema, switch those FKs to plain `String` with a runtime validation layer).
3. Replace `core/identity` with AgentLoft's existing JWT/session middleware. The contract is: populate `req.user = { id, role, brokerageId, agentId }` and the GraphQL context picks it up.
4. Replace `CurrentUserService` on the frontend with whatever AgentLoft already uses (Apollo query, cookie read, etc.).

## Frontend integration

The Angular package.json mirrors AgentLoft's exactly (Angular 21, Tailwind 4, apollo-angular, ng-select, ngx-loading-bar, ngx-cookie-service, Resend, Sentry, Vitest). To merge:

1. Drop `web/src/app/core/nav/nav.config.ts` and `web/src/app/shell/*` into AgentLoft's app.
2. Wire up `apollo-angular` to point at the same GraphQL endpoint as the existing AgentLoft client.
3. Use AgentLoft's existing layout shell if there is one — the sidebar here can replace it, or sit as a new layout for `/operations`, `/intelligence`, `/admin` routes.

## Conventions

- **GraphQL**: code-first (`@nestjs/graphql`). No SDL files checked in; schema generated at build.
- **Naming**: `XxxModule`, `XxxService`, `XxxResolver`, `XxxType` (GraphQL), `xxx.dto.ts` (inputs).
- **Errors**: throw `NotFoundException`, `ForbiddenException`, `BadRequestException`. Don't swallow.
- **DTOs validated** via `class-validator` decorators + `ValidationPipe` (already wired in `main.ts`).
- **Frontend components**: standalone, signal-based. Match AgentLoft's existing patterns once we see them.

## What to build next

See [`ROADMAP.md`](./ROADMAP.md) for priority order and per-module specs.
