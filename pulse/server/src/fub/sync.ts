import { config, fubConfigured } from '../config';
import { db, getMeta, setMeta } from '../db';
import { fetchCalls, fetchUsers, FubCall, FubUser } from './client';

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

let running = false;
let lastError: string | null = null;
let lastFinishedAt: string | null = null;

export function syncState(): { running: boolean; lastError: string | null; lastFinishedAt: string | null } {
  return { running, lastError, lastFinishedAt };
}

/** Runs a full sync (agents, then calls). Throws if FUB is not configured. */
export async function syncAll(): Promise<{ agents: number; calls: number }> {
  if (!fubConfigured()) {
    throw new Error('FUB_API_KEY is not set — add it to pulse/server/.env to enable syncing.');
  }
  const agents = await syncAgents();
  const calls = await syncCalls();
  return { agents, calls };
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
