# Mockups

Self-contained HTML mockups — open in a browser, no build step. Tailwind via CDN, Inter from Google Fonts. All linked together via the sidebar.

## Screens

| File | Screen | Pattern |
|---|---|---|
| `dashboard.html` | **Dashboard** | KPI tiles, pipeline funnel, top performers, deadlines, activity feed |
| `index.html` | **Deals list** | Attio-style table with status pills, agent avatars, filters, KPI strip |
| `deal.html` | **Deal detail** | Notion-style with property panel, status pipeline, commission breakdown, vendors, activity |
| `agent.html` | **Agent profile** | Header + tabs, KPIs, cap progress, deal history, license & comp panels |
| `reporting.html` | **Production report** | Filter bar, summary tiles, leaderboard table with inline bar charts |
| `commissions.html` | **CDAs / Payouts** | Two-column: pending CDA cards (approve/reject) + recent disbursements ledger |
| `recruiting.html` | **Recruiting kanban** | 6-column board (Prospect → Joined / Lost), prospect cards with last-year GCI |

Click sidebar items to navigate between them. Each highlights the active section.

## What these prove

1. **Visual quality bar** — Notion + Attio direction, restrained color, real empty states, generous typography
2. **Information architecture** — full sidebar with WORK / OPERATIONS / GROWTH / INTELLIGENCE / ADMIN, role-gated, sub-nav for parent items
3. **Pattern coverage** — table, detail, profile, dashboard, board, financial ledger, reporting — most major UI patterns the OS will need
4. **Data depth** — every screen pulls from realistic seed data; numbers are internally consistent across screens (Sally's deals appear on her profile, in the leaderboard, in Deals list, etc.)

## Not in the mockups

- Interactivity (filters don't filter, drag-drop doesn't drag)
- Mobile breakpoints (designed for desktop ≥1280px)
- Other modules: Documents, Training, Compliance, Vendors, Marketing Ops, Lead Sources detail, etc. — easy to add following the same patterns

## Translating to Angular

Each mockup decomposes into reusable components:
- **Shell**: sidebar, topbar (already in `/web/src/app/shell`)
- **Atoms**: button, input, status pill, avatar, kbd, badge, KPI tile
- **Molecules**: filter bar, segmented control, property panel row, activity item, kanban card
- **Organisms**: data table, kanban column, leaderboard row, CDA card, ledger list

Once the visual direction is locked, build the component library, then drop these patterns into Angular routes.
