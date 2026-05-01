# Integrations

Brokerage software has to talk to a lot of other systems. This doc defines the **adapter contracts** so each integration can be built independently and swapped without touching domain code.

## Pattern

```
/api/src/integrations
  /mls
    mls.adapter.ts          interface
    reso.adapter.ts         RESO Web API impl
  /crm
    crm.adapter.ts          interface
    follow-up-boss.adapter.ts
    sierra.adapter.ts
  /accounting
    accounting.adapter.ts
    quickbooks.adapter.ts
  /documents
    documents.adapter.ts
    dotloop.adapter.ts
    skyslope.adapter.ts
  /email
    resend.adapter.ts
  /sms
    twilio.adapter.ts
```

Domain modules depend on the **interface**, never the implementation. DI binds the impl at module bootstrap.

## Priority integrations

### MLS (RESO Web API)
Read-only. Pull listing data into transactions when a user types an MLS number.
```ts
interface MlsAdapter {
  getListing(mlsNumber: string): Promise<ListingDto>;
  searchListings(q: ListingQuery): Promise<ListingDto[]>;
}
```

### CRM (Follow Up Boss / Sierra)
Bidirectional. Lead created in CRM → appears in AgentLoft `/leads`. Lead converted → closes the loop in CRM.
```ts
interface CrmAdapter {
  syncLeads(since: Date): Promise<LeadDto[]>;
  pushConversion(leadId: string, transactionId: string): Promise<void>;
}
```

### Accounting (QuickBooks Online)
On transaction close: create journal entries for GCI, fees, agent payouts.
```ts
interface AccountingAdapter {
  postCommissionEntry(entry: CommissionLedgerEntry): Promise<{ qbTxnId: string }>;
}
```

### Documents (dotloop / SkySlope)
Send a transaction → opens a "loop" with all parties + required docs. On signature → updates back here.
```ts
interface DocumentsAdapter {
  createLoop(transaction: Transaction): Promise<{ loopUrl: string }>;
  syncSignedDocs(transactionId: string): Promise<DocDto[]>;
}
```

### Email (Resend) — already in package.json
Transactional emails: deadline reminders, commission statements, announcements.

### SMS (Twilio)
Same use cases as email + 2FA.

## Webhook ingestion

Build `POST /webhooks/:adapterId` endpoints early. Most CRM / docs vendors push updates. Persist raw payloads + a parsed event so we can replay if a parser bug lands.

## Credentials

Per-brokerage credentials in `Brokerage.integrations` JSON column (encrypted at rest). Do not put any vendor keys in `.env`.

## Out of scope for v0

All of the above. v0 ships interfaces only — see `/api/src/integrations` (to be created in v2).
