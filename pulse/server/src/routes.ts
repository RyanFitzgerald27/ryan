import { Router } from 'express';
import { config, fubConfigured } from './config';
import { db, getLeadMetadata, setLeadMetadata } from './db';
import {
  dealLeaderboard,
  dealPipeline,
  dealSummary,
  dealTrend,
  leaderboard,
  recentActivity,
  recentClosedDeals,
  recentDeals,
  resolveRange,
  summary,
  trend,
} from './metrics';
import { syncState, triggerSync } from './fub/sync';
import { fetchPerson, type FubPerson } from './fub/client';

export const apiRouter = Router();

function handle(fn: (req: import('express').Request, res: import('express').Response) => void) {
  return (req: import('express').Request, res: import('express').Response) => {
    try {
      fn(req, res);
    } catch (err) {
      console.error('[api]', err);
      res.status(500).json({ error: String((err as Error)?.message ?? err) });
    }
  };
}

function asyncHandle(
  fn: (req: import('express').Request, res: import('express').Response) => Promise<void>,
) {
  return async (req: import('express').Request, res: import('express').Response) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error('[api]', err);
      res.status(500).json({ error: String((err as Error)?.message ?? err) });
    }
  };
}

function pickPrimary<T extends { isPrimary?: number | boolean; value?: string }>(
  arr: T[] | undefined,
): string | null {
  if (!arr || arr.length === 0) return null;
  const primary = arr.find((x) => x.isPrimary) ?? arr[0];
  return primary?.value ?? null;
}

function shapePerson(p: FubPerson) {
  const agentRow = p.assignedUserId
    ? (db
        .prepare('SELECT name FROM agents WHERE id = ?')
        .get(p.assignedUserId) as { name?: string } | undefined)
    : undefined;
  const assignedName = p.assignedTo ?? agentRow?.name ?? null;
  const fullName =
    p.name ?? ([p.firstName, p.lastName].filter(Boolean).join(' ').trim() || null);
  const addr = p.addresses?.[0];
  return {
    id: p.id,
    name: fullName,
    firstName: p.firstName ?? null,
    lastName: p.lastName ?? null,
    stage: p.stage ?? null,
    source: p.source ?? null,
    sourceUrl: p.sourceUrl ?? null,
    assignedUserId: p.assignedUserId ?? null,
    assignedName,
    email: pickPrimary(p.emails),
    phone: pickPrimary(p.phones),
    city: addr?.city ?? null,
    state: addr?.state ?? null,
    postalCode: addr?.postalCode ?? null,
    tags: p.tags ?? [],
    created: p.created ?? null,
    updated: p.updated ?? null,
    lastActivity: p.lastActivity ?? null,
    lastCommunication: p.lastCommunication ?? null,
    price: p.price ?? null,
    targetBuyDate: getLeadMetadata(p.id).targetBuyDate,
  };
}

function isValidIsoDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

apiRouter.get(
  '/health',
  handle((_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  }),
);

apiRouter.get(
  '/config',
  handle((_req, res) => {
    const count = (table: string): number =>
      (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
    res.json({
      fubConfigured: fubConfigured(),
      timezone: config.timezone,
      conversation: config.conversation,
      autoSyncMinutes: config.sync.intervalMinutes,
      totals: {
        calls: count('calls'),
        agents: count('agents'),
        messages: count('messages'),
        deals: count('deals'),
      },
    });
  }),
);

apiRouter.get(
  '/summary',
  handle((req, res) => {
    const range = resolveRange(String(req.query.range ?? 'last30'));
    res.json({ range, summary: summary(range) });
  }),
);

apiRouter.get(
  '/leaderboard',
  handle((req, res) => {
    const range = resolveRange(String(req.query.range ?? 'last30'));
    res.json({ range, agents: leaderboard(range) });
  }),
);

apiRouter.get(
  '/trend',
  handle((req, res) => {
    const range = resolveRange(String(req.query.range ?? 'last30'));
    res.json({ range, points: trend(range) });
  }),
);

apiRouter.get(
  '/activity',
  handle((req, res) => {
    const range = resolveRange(String(req.query.range ?? 'last30'));
    const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 50)));
    res.json({ activity: recentActivity({ range, limit }) });
  }),
);

apiRouter.get(
  '/deals/summary',
  handle((req, res) => {
    const range = resolveRange(String(req.query.range ?? 'year'));
    res.json({ range, summary: dealSummary(range) });
  }),
);

apiRouter.get(
  '/deals/leaderboard',
  handle((req, res) => {
    const range = resolveRange(String(req.query.range ?? 'year'));
    res.json({ range, agents: dealLeaderboard(range) });
  }),
);

apiRouter.get(
  '/deals/pipeline',
  handle((_req, res) => {
    res.json({ stages: dealPipeline() });
  }),
);

apiRouter.get(
  '/deals/trend',
  handle((req, res) => {
    const range = resolveRange(String(req.query.range ?? 'year'));
    res.json({ range, points: dealTrend(range) });
  }),
);

apiRouter.get(
  '/deals/list',
  handle((req, res) => {
    const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 50)));
    const status = req.query.status ? String(req.query.status) : undefined;
    const agentId = req.query.agentId ? Number(req.query.agentId) : undefined;
    res.json({ deals: recentDeals({ limit, status, agentId }) });
  }),
);

apiRouter.get(
  '/deals/closed',
  handle((req, res) => {
    const range = resolveRange(String(req.query.range ?? 'last30'));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 10)));
    res.json({ range, deals: recentClosedDeals(range, limit) });
  }),
);

apiRouter.get(
  '/people/:id',
  asyncHandle(async (req, res) => {
    if (!fubConfigured()) {
      res.status(400).json({
        error: 'FUB_API_KEY is not set. Add it to pulse/server/.env and restart the server.',
      });
      return;
    }
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid person id' });
      return;
    }
    const person = await fetchPerson(id);
    if (!person) {
      res.status(404).json({ error: 'Person not found' });
      return;
    }
    res.json({ person: shapePerson(person) });
  }),
);

apiRouter.patch(
  '/people/:id/metadata',
  handle((req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid person id' });
      return;
    }
    const body = (req.body ?? {}) as { targetBuyDate?: string | null };
    const patch: { targetBuyDate?: string | null } = {};
    if ('targetBuyDate' in body) {
      if (body.targetBuyDate === null || body.targetBuyDate === '') {
        patch.targetBuyDate = null;
      } else if (isValidIsoDate(body.targetBuyDate)) {
        patch.targetBuyDate = body.targetBuyDate;
      } else {
        res.status(400).json({ error: 'targetBuyDate must be YYYY-MM-DD or null' });
        return;
      }
    }
    const saved = setLeadMetadata(id, patch);
    res.json({ metadata: saved });
  }),
);

apiRouter.get(
  '/agents',
  handle((_req, res) => {
    const agents = db
      .prepare('SELECT id, name, email, role, active FROM agents ORDER BY name')
      .all();
    res.json({ agents });
  }),
);

apiRouter.get(
  '/sync/status',
  handle((_req, res) => {
    const runs = db
      .prepare('SELECT * FROM sync_runs ORDER BY id DESC LIMIT 10')
      .all();
    const lastSuccess = db
      .prepare(
        "SELECT * FROM sync_runs WHERE entity = 'calls' AND status = 'success' ORDER BY id DESC LIMIT 1",
      )
      .get();
    res.json({ ...syncState(), runs, lastCallSync: lastSuccess ?? null });
  }),
);

apiRouter.post(
  '/sync',
  handle((_req, res) => {
    if (!fubConfigured()) {
      res.status(400).json({
        error: 'FUB_API_KEY is not set. Add it to pulse/server/.env and restart the server.',
      });
      return;
    }
    const started = triggerSync();
    res.status(started ? 202 : 409).json({
      started,
      message: started ? 'Sync started.' : 'A sync is already running.',
    });
  }),
);
