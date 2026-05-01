# Mockups

Self-contained HTML mockups — open directly in a browser, no build step. Tailwind via CDN, Inter from Google Fonts.

## Screens

- [`index.html`](./index.html) — **Deals list** (Attio-style table, KPIs, filters, role-gated nav)
- [`deal.html`](./deal.html) — **Deal detail** (Notion-style with property panel, commission breakdown, vendors, activity)

Click any deal row in the list to open the detail. Click "Deals" in the sidebar from detail to go back.

## What these prove

1. **Visual quality bar** — dense Attio table feel + Notion property panel + restrained color (status pills, no neon, generous whitespace)
2. **Information architecture** — full sidebar matching AgentLoft mid-fi with Operations / Growth / Intelligence / Admin sections
3. **Data depth** — commission breakdown shows splits, off-the-top fees, per-agent fees, brokerage net — all from the Prisma schema
4. **Real numbers** — values match the seed data in `/api/prisma/seed.ts`

## Not in the mockup

- Interactivity (filters don't actually filter, etc.)
- Other screens (Dashboard, Agent profile, Reporting) — add as needed
- Mobile responsive breakpoints

## Translating to Angular

Once the visual direction is locked, the mockup becomes the spec:
1. Componentize each block (KPI tile, status pill, table, property panel, activity timeline)
2. Wire to the GraphQL `transactions` and `transactionBreakdown` queries
3. Drop into the existing Angular shell at `/web/src/app/features/deals`
