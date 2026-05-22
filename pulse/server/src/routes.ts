import { Router } from 'express';
import { config, fubConfigured } from './config';
import { db } from './db';
import {
  dealLeaderboard,
  dealPipeline,
  dealSummary,
  dealTrend,
  leaderboard,
  recentCalls,
  recentDeals,
  resolveRange,
  summary,
  trend,
} from './metrics';
import { syncState, triggerSync } from './fub/sync';

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

apiRouter.get(
  '/health',
  handle((_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  }),
);

apiRouter.get(
  '/config',
  handle((_req, res) => {
    const totalCalls = (db.prepare('SELECT COUNT(*) AS n FROM calls').get() as { n: number }).n;
    const totalAgents = (db.prepare('SELECT COUNT(*) AS n FROM agents').get() as { n: number }).n;
    const totalDeals = (db.prepare('SELECT COUNT(*) AS n FROM deals').get() as { n: number }).n;
    res.json({
      fubConfigured: fubConfigured(),
      timezone: config.timezone,
      conversation: config.conversation,
      autoSyncMinutes: config.sync.intervalMinutes,
      totals: { calls: totalCalls, agents: totalAgents, deals: totalDeals },
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
  '/calls',
  handle((req, res) => {
    const range = req.query.range ? resolveRange(String(req.query.range)) : undefined;
    const agentId = req.query.agentId ? Number(req.query.agentId) : undefined;
    const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 50)));
    res.json({
      calls: recentCalls({ range, agentId, limit }),
    });
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
