# Roadmap

Status legend: ✅ built · 🟡 stubbed (route + nav + spec) · 🔴 not started

## v0 (this scaffold)

- ✅ Repo structure (`/api`, `/web`, `/docs`, `docker-compose.yml`)
- ✅ Prisma schema covering Core + Transactions
- ✅ Seed script (8 agents, 10 transactions, lead sources, vendors)
- ✅ NestJS app shell with GraphQL + ConfigModule
- ✅ Transactions module: types, service, resolver, commission calc
- ✅ Angular shell: dark sidebar matching AgentLoft mid-fi, role-gated nav, collapsible parents
- ✅ Routes for every nav item (placeholder content)

## v1 — recommended next sprint

| Order | Module | Why first |
|---|---|---|
| 1 | **Transactions UI** | List, detail, create, edit. The reference module is built on the API; UI is all that's missing. |
| 2 | **Agent Roster + My Profile** | Highest cross-module data dependency. Unlocks per-agent reports. |
| 3 | **Auth integration** | Replace stub `CurrentUserService` + `IdentityModule` with AgentLoft's real auth. |
| 4 | **Reporting → Production** | First end-to-end value loop: agents, deals, commissions → exec dashboard. |
| 5 | **Vendors UI** | Already in the data model; UI is straightforward CRUD. |

## v2 — operations layer

- Agent Lifecycle (onboarding, licensing, E&O, cap plans)
- Commissions UI (CDAs, payouts, ledgers, referrals)
- Documents + e-sign integration (dotloop or SkySlope adapter)
- Compliance file review

## v3 — growth & intelligence

- Recruiting pipeline
- Marketing Ops (request → fulfillment)
- Announcements (Resend + Twilio)
- Reporting: Pipeline, Lead Sources, Financial, Recruiting, Custom
- Insights (LLM-generated weekly digest)
- Training (courses, completion)

## v4 — admin

- Org / Users & Roles / Custom permissions
- Integrations panel (MLS, FUB/Sierra, QuickBooks)
- Audit log viewer
- Feature flags
- API keys & webhooks

## Per-module specs

Each stubbed module should get a `MODULE_SPEC.md` before build. Template:

```
# <Module> spec
## Scope
## Models (added to schema.prisma)
## Resolvers / mutations
## Permissions
## Screens
## Integrations
## Out of scope
```

Specs to write next: Agent Lifecycle, Recruiting, Commissions, Vendors, Documents, Compliance.

## Cross-cutting work

- **Design system**: Storybook + reusable Angular components (Button, Input, Table, Drawer, EmptyState, StatusPill, KPI tile). The placeholder UI here uses raw Tailwind; ship a component library before scaling features.
- **Command palette** (Cmd+K): jump to any record, run any action. Stubbed in `sidebar.component.ts`.
- **Optimistic mutations** in Apollo for snappy table editing (Attio feel).
- **DataLoader** in NestJS to avoid N+1 on transaction list queries.
- **Sentry** wiring (already in package.json — match AgentLoft's DSN config).
