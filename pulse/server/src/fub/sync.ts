import { config, fubConfigured } from '../config';
import { db, getMeta, setMeta } from '../db';
import {
  fetchCalls,
  fetchDeals,
  fetchEmails,
  fetchTextMessages,
  fetchUsers,
  FubCall,
  FubDeal,
  FubEmail,
  FubTextMessage,
  FubUser,
} from './client';

function userDisplayName(u: FubUser): string {
  if (u.name && u.name.trim()) return u.name.trim();
  const joined = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return joined || `User ${u.id}`;
}

/** Normalizes any timestamp FUB returns into a UTC ISO 8601 string. */
function toIso(value: string | undefined): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function startRun(entity: string): number {
  const info = db
    .prepare('INSERT INTO sync_runs (entity, started_at, status) VALUES (?, ?, ?)')
    .run(entity, new Date().toISOString(), 'running');
  return Number(info.lastInsertRowid);
}

function finishRun(id: number, records: number, status: string, message: string | null): void {
  db.prepare(
    'UPDATE sync_runs SET finished_at = ?, records = ?, status = ?, message = ? WHERE id = ?',
  ).run(new Date().toISOString(), records, status, message, id);
}

export async function syncAgents(): Promise<number> {
  const runId = startRun('agents');
  let count = 0;
  try {
    const upsert = db.prepare(`
      INSERT INTO agents (id, name, email, role, active, updated_at)
      VALUES (@id, @name, @email, @role, @active, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, email = excluded.email, role = excluded.role,
        active = excluded.active, updated_at = excluded.updated_at
    `);
    const now = new Date().toISOString();

    for await (const page of fetchUsers()) {
      const writePage = db.transaction((users: FubUser[]) => {
        for (const u of users) {
          upsert.run({
            id: u.id,
            name: userDisplayName(u),
            email: u.email ?? null,
            role: u.role ?? null,
            active: (u.status ?? 'Active').toLowerCase() === 'active' ? 1 : 0,
            updated_at: now,
          });
          count++;
        }
      });
      writePage(page);
    }

    finishRun(runId, count, 'success', null);
    return count;
  } catch (err) {
    finishRun(runId, count, 'error', String((err as Error)?.message ?? err));
    throw err;
  }
}

export async function syncCalls(): Promise<number> {
  const runId = startRun('calls');
  let count = 0;
  try {
    const lastSynced = getMeta('calls_last_synced');
    // Re-pull a one-day overlap so calls edited just after a sync aren't missed.
    const since = lastSynced
      ? new Date(Date.parse(lastSynced) - 24 * 60 * 60 * 1000)
      : new Date(Date.now() - config.sync.lookbackDays * 24 * 60 * 60 * 1000);
    const sinceMs = since.getTime();

    const lookupAgent = db.prepare('SELECT name FROM agents WHERE id = ?');
    const upsert = db.prepare(`
      INSERT INTO calls
        (id, agent_id, agent_name, person_id, phone, is_incoming, duration, outcome, note, created_at, synced_at)
      VALUES
        (@id, @agent_id, @agent_name, @person_id, @phone, @is_incoming, @duration, @outcome, @note, @created_at, @synced_at)
      ON CONFLICT(id) DO UPDATE SET
        agent_id = excluded.agent_id, agent_name = excluded.agent_name,
        person_id = excluded.person_id, phone = excluded.phone,
        is_incoming = excluded.is_incoming, duration = excluded.duration,
        outcome = excluded.outcome, note = excluded.note,
        created_at = excluded.created_at, synced_at = excluded.synced_at
    `);
    const now = new Date().toISOString();
    let reachedWindowEnd = false;

    for await (const page of fetchCalls()) {
      const fresh = page.filter((c) => {
        const iso = toIso(c.created);
        return iso !== null && Date.parse(iso) >= sinceMs;
      });

      const writePage = db.transaction((calls: FubCall[]) => {
        for (const c of calls) {
          const createdIso = toIso(c.created);
          if (!createdIso) continue;
          const agentRow = c.userId
            ? (lookupAgent.get(c.userId) as { name: string } | undefined)
            : undefined;
          upsert.run({
            id: c.id,
            agent_id: c.userId ?? null,
            agent_name: agentRow?.name ?? null,
            person_id: c.personId ?? null,
            phone: c.phone ?? null,
            is_incoming: c.isIncoming ? 1 : 0,
            duration: Math.max(0, Math.round(c.duration ?? 0)),
            outcome: c.outcome ?? null,
            note: c.note ?? null,
            created_at: createdIso,
            synced_at: now,
          });
          count++;
        }
      });
      writePage(fresh);

      // Calls arrive newest-first; once an entire page predates the window
      // there is nothing older worth fetching.
      if (page.length > 0 && page.every((c) => {
        const iso = toIso(c.created);
        return iso === null || Date.parse(iso) < sinceMs;
      })) {
        reachedWindowEnd = true;
      }
      if (reachedWindowEnd) break;
    }

    setMeta('calls_last_synced', now);
    finishRun(runId, count, 'success', null);
    return count;
  } catch (err) {
    finishRun(runId, count, 'error', String((err as Error)?.message ?? err));
    throw err;
  }
}

function numberOrZero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function numberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Reads a `name` field whether the value is a plain string or a nested object. */
function namedField(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (value && typeof value === 'object' && typeof (value as any).name === 'string') {
    return ((value as any).name as string).trim() || null;
  }
  return null;
}

function dealPipeline(d: FubDeal): string | null {
  return d.pipelineName?.trim() || namedField(d.pipeline);
}

function dealStage(d: FubDeal): string | null {
  return d.stageName?.trim() || namedField(d.stage);
}

function normalizeDealStatus(raw: string | undefined): 'open' | 'won' | 'lost' {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('won')) return 'won';
  if (s.includes('lost')) return 'lost';
  return 'open';
}

/** Resolves the agent who owns a deal across FUB's several representations. */
function dealAgent(d: FubDeal): { id: number | null; name: string | null } {
  let id: number | null = typeof d.ownerId === 'number' ? d.ownerId : null;
  if (id === null && Array.isArray(d.users) && d.users.length > 0) {
    const first = d.users[0];
    if (typeof first === 'number') id = first;
    else if (first && typeof first === 'object' && typeof (first as any).id === 'number') {
      id = (first as any).id;
    }
  }
  return { id, name: namedField(d.owner) };
}

export async function syncDeals(): Promise<number> {
  const runId = startRun('deals');
  let count = 0;
  try {
    const lookupAgent = db.prepare('SELECT name FROM agents WHERE id = ?');
    const upsert = db.prepare(`
      INSERT INTO deals
        (source, source_id, name, pipeline, stage, status, price, commission,
         agent_id, agent_name, projected_close, closed_date, created_at, updated_at, synced_at)
      VALUES
        ('fub', @source_id, @name, @pipeline, @stage, @status, @price, @commission,
         @agent_id, @agent_name, @projected_close, @closed_date, @created_at, @updated_at, @synced_at)
      ON CONFLICT(source, source_id) DO UPDATE SET
        name = excluded.name, pipeline = excluded.pipeline, stage = excluded.stage,
        status = excluded.status, price = excluded.price, commission = excluded.commission,
        agent_id = excluded.agent_id, agent_name = excluded.agent_name,
        projected_close = excluded.projected_close, closed_date = excluded.closed_date,
        created_at = excluded.created_at, updated_at = excluded.updated_at,
        synced_at = excluded.synced_at
    `);
    const now = new Date().toISOString();

    for await (const page of fetchDeals()) {
      const writePage = db.transaction((deals: FubDeal[]) => {
        for (const d of deals) {
          const status = normalizeDealStatus(d.status);
          const agent = dealAgent(d);
          const agentRow = agent.id
            ? (lookupAgent.get(agent.id) as { name: string } | undefined)
            : undefined;
          const closed =
            status === 'open'
              ? null
              : toIso(d.closedDate ?? d.wonDate ?? d.lostDate ?? d.updated);
          upsert.run({
            source_id: String(d.id),
            name: d.name?.trim() || `Deal ${d.id}`,
            pipeline: dealPipeline(d),
            stage: dealStage(d),
            status,
            price: numberOrZero(d.price ?? d.value),
            commission: numberOrNull(d.commissionValue ?? d.commission),
            agent_id: agent.id,
            agent_name: agentRow?.name ?? agent.name,
            projected_close: toIso(d.projectedCloseDate),
            closed_date: closed,
            created_at: toIso(d.created),
            updated_at: toIso(d.updated),
            synced_at: now,
          });
          count++;
        }
      });
      writePage(page);
    }

    finishRun(runId, count, 'success', null);
    return count;
  } catch (err) {
    finishRun(runId, count, 'error', String((err as Error)?.message ?? err));
    throw err;
  }
}

interface NormalizedMessage {
  source_id: string;
  agent_id: number | null;
  person_id: number | null;
  is_incoming: number;
  body: string | null;
  created_at: string;
}

/** Shared incremental sync for a message channel (texts or emails). */
async function syncMessageChannel(
  entity: string,
  type: 'text' | 'email',
  watermarkKey: string,
  pages: () => AsyncGenerator<unknown[]>,
  normalize: (raw: never) => NormalizedMessage | null,
): Promise<number> {
  const runId = startRun(entity);
  let count = 0;
  try {
    const lastSynced = getMeta(watermarkKey);
    const since = lastSynced
      ? new Date(Date.parse(lastSynced) - 24 * 60 * 60 * 1000)
      : new Date(Date.now() - config.sync.lookbackDays * 24 * 60 * 60 * 1000);
    const sinceMs = since.getTime();

    const lookupAgent = db.prepare('SELECT name FROM agents WHERE id = ?');
    const upsert = db.prepare(`
      INSERT INTO messages
        (source, type, source_id, agent_id, agent_name, person_id, is_incoming, body, created_at, synced_at)
      VALUES
        ('fub', @type, @source_id, @agent_id, @agent_name, @person_id, @is_incoming, @body, @created_at, @synced_at)
      ON CONFLICT(source, type, source_id) DO UPDATE SET
        agent_id = excluded.agent_id, agent_name = excluded.agent_name,
        person_id = excluded.person_id, is_incoming = excluded.is_incoming,
        body = excluded.body, created_at = excluded.created_at, synced_at = excluded.synced_at
    `);
    const now = new Date().toISOString();
    let reachedWindowEnd = false;

    for await (const page of pages()) {
      const normalized = (page as never[])
        .map(normalize)
        .filter((r): r is NormalizedMessage => r !== null);
      const fresh = normalized.filter((r) => Date.parse(r.created_at) >= sinceMs);

      const writePage = db.transaction((rows: NormalizedMessage[]) => {
        for (const r of rows) {
          const agentRow = r.agent_id
            ? (lookupAgent.get(r.agent_id) as { name: string } | undefined)
            : undefined;
          upsert.run({
            type,
            source_id: r.source_id,
            agent_id: r.agent_id,
            agent_name: agentRow?.name ?? null,
            person_id: r.person_id,
            is_incoming: r.is_incoming,
            body: r.body,
            created_at: r.created_at,
            synced_at: now,
          });
          count++;
        }
      });
      writePage(fresh);

      // Messages arrive newest-first; stop once a whole page predates the window.
      if (normalized.length > 0 && normalized.every((r) => Date.parse(r.created_at) < sinceMs)) {
        reachedWindowEnd = true;
      }
      if (reachedWindowEnd) break;
    }

    setMeta(watermarkKey, now);
    finishRun(runId, count, 'success', null);
    return count;
  } catch (err) {
    finishRun(runId, count, 'error', String((err as Error)?.message ?? err));
    throw err;
  }
}

function normalizeText(t: FubTextMessage): NormalizedMessage | null {
  const created = toIso(t.created);
  if (!created) return null;
  const body = (t.message ?? t.body ?? '').trim();
  return {
    source_id: String(t.id),
    agent_id: t.userId ?? null,
    person_id: t.personId ?? null,
    is_incoming: t.isIncoming ? 1 : 0,
    body: body ? body.slice(0, 280) : null,
    created_at: created,
  };
}

function normalizeEmail(e: FubEmail): NormalizedMessage | null {
  const created = toIso(e.created);
  if (!created) return null;
  const subject = (e.subject ?? '').trim();
  return {
    source_id: String(e.id),
    agent_id: e.userId ?? null,
    person_id: e.personId ?? null,
    is_incoming: e.isIncoming ? 1 : 0,
    body: subject ? subject.slice(0, 280) : null,
    created_at: created,
  };
}

export function syncTexts(): Promise<number> {
  return syncMessageChannel(
    'texts',
    'text',
    'texts_last_synced',
    fetchTextMessages,
    normalizeText as (raw: never) => NormalizedMessage | null,
  );
}

export function syncEmails(): Promise<number> {
  return syncMessageChannel(
    'emails',
    'email',
    'emails_last_synced',
    fetchEmails,
    normalizeEmail as (raw: never) => NormalizedMessage | null,
  );
}

let running = false;
let lastError: string | null = null;
let lastFinishedAt: string | null = null;

export function syncState(): { running: boolean; lastError: string | null; lastFinishedAt: string | null } {
  return { running, lastError, lastFinishedAt };
}

export interface SyncResult {
  agents: number;
  calls: number;
  texts: number;
  emails: number;
  deals: number;
}

/** Runs an optional sync step; a failure is logged but never aborts the run. */
async function syncOptional(label: string, fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch (err) {
    console.error(
      `[sync] ${label} sync failed (continuing):`,
      String((err as Error)?.message ?? err),
    );
    return 0;
  }
}

/** Runs a full sync (agents, calls, texts, emails, deals). */
export async function syncAll(): Promise<SyncResult> {
  if (!fubConfigured()) {
    throw new Error('FUB_API_KEY is not set — add it to pulse/server/.env to enable syncing.');
  }
  const agents = await syncAgents();
  const calls = await syncCalls();

  // Texts, emails and deals are optional: a failure on one (feature disabled,
  // endpoint unavailable) must not lose the others. Each is recorded in
  // sync_runs and surfaced separately.
  const texts = await syncOptional('texts', syncTexts);
  const emails = await syncOptional('emails', syncEmails);
  const deals = await syncOptional('deals', syncDeals);

  return { agents, calls, texts, emails, deals };
}

/** Starts a sync in the background. Returns false if one is already running. */
export function triggerSync(): boolean {
  if (running) return false;
  running = true;
  lastError = null;
  syncAll()
    .catch((err) => {
      lastError = String((err as Error)?.message ?? err);
      console.error('[sync] failed:', lastError);
    })
    .finally(() => {
      running = false;
      lastFinishedAt = new Date().toISOString();
    });
  return true;
}
