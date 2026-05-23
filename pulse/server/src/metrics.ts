import { config } from './config';
import { db } from './db';

export interface Range {
  name: string;
  label: string;
  start: string;
  end: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Milliseconds to add to a UTC instant to get the configured tz wall clock. */
function tzOffsetMs(at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: config.timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const m: Record<string, string> = {};
  for (const p of dtf.formatToParts(at)) m[p.type] = p.value;
  const asUtc = Date.UTC(+m.year, +m.month - 1, +m.day, +m.hour, +m.minute, +m.second);
  return asUtc - at.getTime();
}

/** Calendar parts of an instant, expressed in the configured timezone. */
function zonedParts(at: Date): { year: number; month: number; day: number; weekday: string } {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: config.timezone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const m: Record<string, string> = {};
  for (const p of dtf.formatToParts(at)) m[p.type] = p.value;
  return { year: +m.year, month: +m.month, day: +m.day, weekday: m.weekday };
}

/** The UTC instant of local midnight (in the configured tz) for a given date. */
function zonedMidnight(year: number, month: number, day: number): Date {
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offset = tzOffsetMs(new Date(guess));
  return new Date(guess - offset);
}

function bucketKey(at: Date, byMonth: boolean): string {
  const p = zonedParts(at);
  const mm = String(p.month).padStart(2, '0');
  if (byMonth) return `${p.year}-${mm}`;
  return `${p.year}-${mm}-${String(p.day).padStart(2, '0')}`;
}

export function resolveRange(name: string): Range {
  const now = new Date();
  const today = zonedParts(now);
  const todayStart = zonedMidnight(today.year, today.month, today.day);
  const end = now.toISOString();
  const daysSinceMonday = (WEEKDAYS.indexOf(today.weekday) + 6) % 7;

  let start: Date;
  let label: string;

  switch (name) {
    case 'today':
      start = todayStart;
      label = 'Today';
      break;
    case 'week':
      start = new Date(todayStart.getTime() - daysSinceMonday * DAY_MS);
      label = 'This Week';
      break;
    case 'last7':
      start = new Date(todayStart.getTime() - 6 * DAY_MS);
      label = 'Last 7 Days';
      break;
    case 'last30':
      start = new Date(todayStart.getTime() - 29 * DAY_MS);
      label = 'Last 30 Days';
      break;
    case 'month':
      start = zonedMidnight(today.year, today.month, 1);
      label = 'This Month';
      break;
    case 'year':
      start = zonedMidnight(today.year, 1, 1);
      label = 'This Year';
      break;
    case 'all': {
      const row = db
        .prepare(
          `SELECT MIN(d) AS earliest FROM (
             SELECT MIN(created_at) AS d FROM calls
             UNION ALL SELECT MIN(created_at) FROM messages
             UNION ALL SELECT MIN(created_at) FROM deals
             UNION ALL SELECT MIN(closed_date) FROM deals
           )`,
        )
        .get() as { earliest: string | null };
      start = row.earliest ? new Date(row.earliest) : new Date(todayStart.getTime() - 29 * DAY_MS);
      label = 'All Time';
      break;
    }
    default:
      return resolveRange('last30');
  }

  return { name, label, start: start.toISOString(), end };
}

/** SQL fragment + params that evaluate to 1 when a call counts as a conversation. */
function conversationExpr(alias = ''): { sql: string; params: (string | number)[] } {
  const col = alias ? `${alias}.` : '';
  const outcomes = config.conversation.outcomes;
  if (outcomes.length > 0) {
    const placeholders = outcomes.map(() => '?').join(', ');
    return {
      sql: `(${col}duration >= ? OR (${col}outcome IS NOT NULL AND ${col}outcome IN (${placeholders})))`,
      params: [config.conversation.minSeconds, ...outcomes],
    };
  }
  return { sql: `(${col}duration >= ?)`, params: [config.conversation.minSeconds] };
}

// ---------------------------------------------------------------------------
// Activity (calls, texts, emails)
//
// A "conversation" is a meaningful two-way contact within the range:
//   - a connected phone call (>= threshold seconds, or a contact outcome), and
//   - each lead who replied by text   (counted once per lead), and
//   - each lead who replied by email  (counted once per lead).
// ---------------------------------------------------------------------------

export interface Summary {
  calls: number;
  texts: number;
  emails: number;
  callConversations: number;
  textConversations: number;
  emailConversations: number;
  conversations: number;
  talkSeconds: number;
  activeAgents: number;
}

export function summary(range: Range): Summary {
  const conv = conversationExpr();
  const callRow = db
    .prepare(
      `SELECT COUNT(*) AS calls,
              COALESCE(SUM(CASE WHEN ${conv.sql} THEN 1 ELSE 0 END), 0) AS callConversations,
              COALESCE(SUM(duration), 0) AS talkSeconds
       FROM calls
       WHERE created_at >= ? AND created_at <= ?`,
    )
    .get(...conv.params, range.start, range.end) as {
    calls: number;
    callConversations: number;
    talkSeconds: number;
  };

  const msgRow = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'text' THEN 1 ELSE 0 END), 0) AS texts,
         COALESCE(SUM(CASE WHEN type = 'email' THEN 1 ELSE 0 END), 0) AS emails,
         COUNT(DISTINCT CASE WHEN type = 'text' AND is_incoming = 1 THEN person_id END) AS textConversations,
         COUNT(DISTINCT CASE WHEN type = 'email' AND is_incoming = 1 THEN person_id END) AS emailConversations
       FROM messages
       WHERE created_at >= ? AND created_at <= ?`,
    )
    .get(range.start, range.end) as {
    texts: number;
    emails: number;
    textConversations: number;
    emailConversations: number;
  };

  const activeAgents = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM (
           SELECT agent_id FROM calls
             WHERE created_at >= ? AND created_at <= ? AND agent_id IS NOT NULL
           UNION
           SELECT agent_id FROM messages
             WHERE created_at >= ? AND created_at <= ? AND agent_id IS NOT NULL
         )`,
      )
      .get(range.start, range.end, range.start, range.end) as { n: number }
  ).n;

  return {
    calls: callRow.calls,
    texts: msgRow.texts,
    emails: msgRow.emails,
    callConversations: callRow.callConversations,
    textConversations: msgRow.textConversations,
    emailConversations: msgRow.emailConversations,
    conversations:
      callRow.callConversations + msgRow.textConversations + msgRow.emailConversations,
    talkSeconds: callRow.talkSeconds,
    activeAgents,
  };
}

export interface AgentStat {
  rank: number;
  agentId: number | null;
  agentName: string;
  calls: number;
  texts: number;
  emails: number;
  conversations: number;
  talkSeconds: number;
}

export function leaderboard(range: Range): AgentStat[] {
  const conv = conversationExpr('c');
  const callRows = db
    .prepare(
      `SELECT c.agent_id AS agentId,
              COALESCE(c.agent_name, a.name, 'Unassigned') AS agentName,
              COUNT(*) AS calls,
              COALESCE(SUM(CASE WHEN ${conv.sql} THEN 1 ELSE 0 END), 0) AS callConversations,
              COALESCE(SUM(c.duration), 0) AS talkSeconds
       FROM calls c
       LEFT JOIN agents a ON a.id = c.agent_id
       WHERE c.created_at >= ? AND c.created_at <= ?
       GROUP BY c.agent_id`,
    )
    .all(...conv.params, range.start, range.end) as {
    agentId: number | null;
    agentName: string;
    calls: number;
    callConversations: number;
    talkSeconds: number;
  }[];

  const msgRows = db
    .prepare(
      `SELECT m.agent_id AS agentId,
              COALESCE(m.agent_name, a.name, 'Unassigned') AS agentName,
              COALESCE(SUM(CASE WHEN m.type = 'text' THEN 1 ELSE 0 END), 0) AS texts,
              COALESCE(SUM(CASE WHEN m.type = 'email' THEN 1 ELSE 0 END), 0) AS emails,
              COUNT(DISTINCT CASE WHEN m.type = 'text' AND m.is_incoming = 1 THEN m.person_id END) AS textConversations,
              COUNT(DISTINCT CASE WHEN m.type = 'email' AND m.is_incoming = 1 THEN m.person_id END) AS emailConversations
       FROM messages m
       LEFT JOIN agents a ON a.id = m.agent_id
       WHERE m.created_at >= ? AND m.created_at <= ?
       GROUP BY m.agent_id`,
    )
    .all(range.start, range.end) as {
    agentId: number | null;
    agentName: string;
    texts: number;
    emails: number;
    textConversations: number;
    emailConversations: number;
  }[];

  const merged = new Map<number | null, AgentStat>();
  for (const c of callRows) {
    merged.set(c.agentId, {
      rank: 0,
      agentId: c.agentId,
      agentName: c.agentName,
      calls: c.calls,
      texts: 0,
      emails: 0,
      conversations: c.callConversations,
      talkSeconds: c.talkSeconds,
    });
  }
  for (const m of msgRows) {
    const existing = merged.get(m.agentId);
    if (existing) {
      existing.texts = m.texts;
      existing.emails = m.emails;
      existing.conversations += m.textConversations + m.emailConversations;
    } else {
      merged.set(m.agentId, {
        rank: 0,
        agentId: m.agentId,
        agentName: m.agentName,
        calls: 0,
        texts: m.texts,
        emails: m.emails,
        conversations: m.textConversations + m.emailConversations,
        talkSeconds: 0,
      });
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.conversations - a.conversations || b.calls - a.calls)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

export interface TrendPoint {
  date: string;
  calls: number;
  messages: number;
}

export function trend(range: Range): TrendPoint[] {
  const callRows = db
    .prepare('SELECT created_at AS createdAt FROM calls WHERE created_at >= ? AND created_at <= ?')
    .all(range.start, range.end) as { createdAt: string }[];
  const msgRows = db
    .prepare('SELECT created_at AS createdAt FROM messages WHERE created_at >= ? AND created_at <= ?')
    .all(range.start, range.end) as { createdAt: string }[];

  const byMonth = range.name === 'year' || range.name === 'all';
  const buckets = new Map<string, TrendPoint>();
  const add = (createdAt: string, field: 'calls' | 'messages') => {
    const key = bucketKey(new Date(createdAt), byMonth);
    const b = buckets.get(key) ?? { date: key, calls: 0, messages: 0 };
    b[field] += 1;
    buckets.set(key, b);
  };
  for (const r of callRows) add(r.createdAt, 'calls');
  for (const r of msgRows) add(r.createdAt, 'messages');

  // Emit a continuous series so the chart has no gaps.
  const series: TrendPoint[] = [];
  if (byMonth) {
    const startP = zonedParts(new Date(range.start));
    const endP = zonedParts(new Date(range.end));
    let year = startP.year;
    let month = startP.month;
    for (let guard = 0; guard < 600; guard++) {
      const key = `${year}-${String(month).padStart(2, '0')}`;
      series.push(buckets.get(key) ?? { date: key, calls: 0, messages: 0 });
      if (year === endP.year && month === endP.month) break;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  } else {
    const endKey = bucketKey(new Date(range.end), false);
    let cursor = new Date(range.start).getTime();
    for (let guard = 0; guard < 400; guard++) {
      const key = bucketKey(new Date(cursor), false);
      series.push(buckets.get(key) ?? { date: key, calls: 0, messages: 0 });
      if (key >= endKey) break;
      cursor += DAY_MS;
    }
  }
  return series;
}

export interface ActivityRow {
  channel: string; // 'call' | 'text' | 'email'
  id: number;
  agentName: string | null;
  personId: number | null;
  isIncoming: number;
  duration: number | null;
  outcome: string | null;
  detail: string | null;
  isConversation: number;
  createdAt: string;
}

/** Unified newest-first feed of calls, texts and emails. */
export function recentActivity(opts: { range: Range; limit: number }): ActivityRow[] {
  const conv = conversationExpr();
  return db
    .prepare(
      `SELECT 'call' AS channel, id, agent_name AS agentName, person_id AS personId,
              is_incoming AS isIncoming, duration, outcome, note AS detail,
              CASE WHEN ${conv.sql} THEN 1 ELSE 0 END AS isConversation,
              created_at AS createdAt
       FROM calls
       WHERE created_at >= ? AND created_at <= ?
       UNION ALL
       SELECT type AS channel, id, agent_name, person_id,
              is_incoming, NULL, NULL, body,
              CASE WHEN is_incoming = 1 THEN 1 ELSE 0 END,
              created_at
       FROM messages
       WHERE created_at >= ? AND created_at <= ?
       ORDER BY createdAt DESC
       LIMIT ?`,
    )
    .all(
      ...conv.params,
      opts.range.start,
      opts.range.end,
      opts.range.start,
      opts.range.end,
      opts.limit,
    ) as ActivityRow[];
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

export interface DealSummary {
  openDeals: number;
  pipelineValue: number;
  wonDeals: number;
  wonVolume: number;
  lostDeals: number;
  commission: number;
  winRate: number;
  avgWonPrice: number;
}

/**
 * Open-pipeline figures are point-in-time (all open deals, range-independent);
 * won/lost figures are filtered to deals closed within the range.
 */
export function dealSummary(range: Range): DealSummary {
  const open = db
    .prepare(
      "SELECT COUNT(*) AS n, COALESCE(SUM(price), 0) AS v FROM deals WHERE status = 'open'",
    )
    .get() as { n: number; v: number };

  const won = db
    .prepare(
      `SELECT COUNT(*) AS n,
              COALESCE(SUM(price), 0) AS v,
              COALESCE(SUM(COALESCE(commission, 0)), 0) AS c
       FROM deals
       WHERE status = 'won' AND closed_date IS NOT NULL
         AND closed_date >= ? AND closed_date <= ?`,
    )
    .get(range.start, range.end) as { n: number; v: number; c: number };

  const lost = db
    .prepare(
      `SELECT COUNT(*) AS n FROM deals
       WHERE status = 'lost' AND closed_date IS NOT NULL
         AND closed_date >= ? AND closed_date <= ?`,
    )
    .get(range.start, range.end) as { n: number };

  const decided = won.n + lost.n;
  return {
    openDeals: open.n,
    pipelineValue: open.v,
    wonDeals: won.n,
    wonVolume: won.v,
    lostDeals: lost.n,
    commission: won.c,
    winRate: decided > 0 ? won.n / decided : 0,
    avgWonPrice: won.n > 0 ? won.v / won.n : 0,
  };
}

export interface DealAgentStat {
  rank: number;
  agentId: number | null;
  agentName: string;
  openDeals: number;
  pipelineValue: number;
  wonDeals: number;
  wonVolume: number;
  commission: number;
}

export function dealLeaderboard(range: Range): DealAgentStat[] {
  const rows = db
    .prepare(
      `SELECT
         d.agent_id AS agentId,
         COALESCE(d.agent_name, a.name, 'Unassigned') AS agentName,
         COALESCE(SUM(CASE WHEN d.status = 'open' THEN 1 ELSE 0 END), 0) AS openDeals,
         COALESCE(SUM(CASE WHEN d.status = 'open' THEN d.price ELSE 0 END), 0) AS pipelineValue,
         COALESCE(SUM(CASE WHEN d.status = 'won' AND d.closed_date >= ? AND d.closed_date <= ?
                           THEN 1 ELSE 0 END), 0) AS wonDeals,
         COALESCE(SUM(CASE WHEN d.status = 'won' AND d.closed_date >= ? AND d.closed_date <= ?
                           THEN d.price ELSE 0 END), 0) AS wonVolume,
         COALESCE(SUM(CASE WHEN d.status = 'won' AND d.closed_date >= ? AND d.closed_date <= ?
                           THEN COALESCE(d.commission, 0) ELSE 0 END), 0) AS commission
       FROM deals d
       LEFT JOIN agents a ON a.id = d.agent_id
       GROUP BY d.agent_id
       HAVING openDeals > 0 OR wonDeals > 0 OR pipelineValue > 0
       ORDER BY wonVolume DESC, pipelineValue DESC`,
    )
    .all(
      range.start,
      range.end,
      range.start,
      range.end,
      range.start,
      range.end,
    ) as Omit<DealAgentStat, 'rank'>[];

  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

export function dealPipeline(): PipelineStage[] {
  return db
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(stage), ''), '(no stage)') AS stage,
              COUNT(*) AS count,
              COALESCE(SUM(price), 0) AS value
       FROM deals
       WHERE status = 'open'
       GROUP BY COALESCE(NULLIF(TRIM(stage), ''), '(no stage)')
       ORDER BY value DESC, count DESC`,
    )
    .all() as PipelineStage[];
}

export interface DealTrendPoint {
  date: string;
  deals: number;
  volume: number;
}

export function dealTrend(range: Range): DealTrendPoint[] {
  const rows = db
    .prepare(
      `SELECT closed_date AS closedDate, price
       FROM deals
       WHERE status = 'won' AND closed_date IS NOT NULL
         AND closed_date >= ? AND closed_date <= ?`,
    )
    .all(range.start, range.end) as { closedDate: string; price: number }[];

  const byMonth = range.name === 'year' || range.name === 'all';
  const buckets = new Map<string, DealTrendPoint>();
  for (const r of rows) {
    const key = bucketKey(new Date(r.closedDate), byMonth);
    const b = buckets.get(key) ?? { date: key, deals: 0, volume: 0 };
    b.deals += 1;
    b.volume += r.price || 0;
    buckets.set(key, b);
  }

  const series: DealTrendPoint[] = [];
  if (byMonth) {
    const startP = zonedParts(new Date(range.start));
    const endP = zonedParts(new Date(range.end));
    let year = startP.year;
    let month = startP.month;
    for (let guard = 0; guard < 600; guard++) {
      const key = `${year}-${String(month).padStart(2, '0')}`;
      series.push(buckets.get(key) ?? { date: key, deals: 0, volume: 0 });
      if (year === endP.year && month === endP.month) break;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  } else {
    const endKey = bucketKey(new Date(range.end), false);
    let cursor = new Date(range.start).getTime();
    for (let guard = 0; guard < 400; guard++) {
      const key = bucketKey(new Date(cursor), false);
      series.push(buckets.get(key) ?? { date: key, deals: 0, volume: 0 });
      if (key >= endKey) break;
      cursor += DAY_MS;
    }
  }
  return series;
}

export interface DealRow {
  id: number;
  source: string;
  sourceId: string;
  name: string | null;
  pipeline: string | null;
  stage: string | null;
  status: string;
  price: number;
  commission: number | null;
  agentId: number | null;
  agentName: string | null;
  projectedClose: string | null;
  closedDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export function recentDeals(opts: {
  limit: number;
  status?: string;
  agentId?: number;
}): DealRow[] {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (opts.status) {
    clauses.push('status = ?');
    params.push(opts.status);
  }
  if (opts.agentId != null) {
    clauses.push('agent_id = ?');
    params.push(opts.agentId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  return db
    .prepare(
      `SELECT id, source, source_id AS sourceId, name, pipeline, stage, status,
              price, commission, agent_id AS agentId, agent_name AS agentName,
              projected_close AS projectedClose, closed_date AS closedDate,
              created_at AS createdAt, updated_at AS updatedAt
       FROM deals
       ${where}
       ORDER BY COALESCE(updated_at, created_at, closed_date) DESC
       LIMIT ?`,
    )
    .all(...params, opts.limit) as DealRow[];
}

/** Won + lost deals with closed_date inside `range`, newest closing first. */
export function recentClosedDeals(range: Range, limit: number): DealRow[] {
  return db
    .prepare(
      `SELECT id, source, source_id AS sourceId, name, pipeline, stage, status,
              price, commission, agent_id AS agentId, agent_name AS agentName,
              projected_close AS projectedClose, closed_date AS closedDate,
              created_at AS createdAt, updated_at AS updatedAt
       FROM deals
       WHERE status IN ('won', 'lost')
         AND closed_date IS NOT NULL
         AND closed_date >= ? AND closed_date <= ?
       ORDER BY closed_date DESC
       LIMIT ?`,
    )
    .all(range.start, range.end, limit) as DealRow[];
}
