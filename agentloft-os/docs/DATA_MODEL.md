# Data model

Full schema lives in [`api/prisma/schema.prisma`](../api/prisma/schema.prisma). This doc explains the *why*.

## Core principles

- **Money in cents** (`Int`). All `*Cents` fields. No floats.
- **Percentages in basis points** (`Int`, 10000 = 100%). All `*Bps` fields.
- **`createdAt` / `updatedAt`** on every table.
- **`cuid()`** primary keys.

## Transactions — the deep end

```
Transaction
  ├─ AgentSplit[]         per-agent split (bps OR flat cents)
  ├─ CommissionLine[]     gross commission lines (sum = GCI)
  ├─ Fee[]                referrals out/in, franchise, admin, E&O, TC, other
  ├─ TransactionLeadSource[]   many-to-many w/ attribution bps
  ├─ TransactionVendor[]       lender, title, inspector, etc.
  ├─ TransactionContact[]      buyer, seller, co-op agent
  └─ CommissionLedgerEntry[]   snapshot per agent on close
```

### Why a separate `CommissionLine` table?
A single deal can have multiple commission income lines (listing side + buyer side, bonuses, lease commission added later). Sum across the rows equals GCI for that transaction. Keeps the math auditable.

### Why `Fee` is separate from `CommissionLine`?
Fees are *outflows* from GCI (or top-up income for `REFERRAL_IN`). Commission lines are *inflows*. Mixing them obscures GCI.

### Why store amounts both as `amountCents` and `bpsOfGci` on `Fee`?
Real brokerages do both. Franchise fees are usually `% of GCI`. Admin fees are usually flat. The calc service handles both.

### Why a `CommissionLedgerEntry`?
On close, snapshot each agent's gross / fees / net so YTD reports don't have to re-walk every fee on every transaction. It's a cheap, append-only audit trail.

### Why `TransactionLeadSource.attributionBps`?
Multi-touch attribution: a deal that started as a Zillow lead but converted via past-client referral can be split 50/50.

### Why `TransactionVendor` instead of `Transaction.lenderId`, etc.?
Too many vendor types to enumerate as columns, and a deal can have multiple vendors per role (rare but real — e.g., two inspectors). The join table is cleaner.

## Roles

```
OWNER, BROKER, ADMIN, TRANSACTION_COORDINATOR, ACCOUNTANT, RECRUITER, AGENT
```

Custom roles + per-permission overrides should live in a future `core/identity/permissions` module — see roadmap.

## Conventions for new modules

When the dev team adds a module (e.g., Recruiting), append to `schema.prisma` under a new section header:

```prisma
// ============================================================
// RECRUITING — prospect agents, pipeline, attribution
// ============================================================
```

Reference existing models (`Agent`, `Brokerage`) by FK. Don't duplicate.

## Migration workflow

```bash
# After editing schema.prisma:
npx prisma migrate dev --name add_xxx
npx prisma generate
```

Migrations live in `api/prisma/migrations/`. Commit them.
