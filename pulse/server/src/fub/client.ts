import { config } from '../config';

/** A user (agent / staff member) in Follow Up Boss. */
export interface FubUser {
  id: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  status?: string;
}

/** A logged call in Follow Up Boss. */
export interface FubCall {
  id: number;
  created: string;
  updated?: string;
  isIncoming?: boolean;
  phone?: string;
  duration?: number;
  note?: string;
  outcome?: string;
  personId?: number;
  userId?: number;
}

/**
 * A deal in Follow Up Boss. Field shapes vary by account (some return nested
 * objects, some flat ids/names), so optional/loose typing is intentional —
 * `sync.ts` normalizes whatever shape arrives.
 */
export interface FubDeal {
  id: number;
  created?: string;
  updated?: string;
  name?: string;
  status?: string;
  stage?: unknown;
  stageId?: number;
  stageName?: string;
  pipeline?: unknown;
  pipelineId?: number;
  pipelineName?: string;
  price?: number;
  value?: number;
  commissionValue?: number;
  commission?: number;
  projectedCloseDate?: string;
  closedDate?: string;
  wonDate?: string;
  lostDate?: string;
  owner?: unknown;
  ownerId?: number;
  users?: unknown;
}

function authHeader(): string {
  return 'Basic ' + Buffer.from(config.fub.apiKey + ':').toString('base64');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Performs an authenticated GET against the FUB API, retrying on rate limits. */
async function fubGet(pathAndQuery: string, attempt = 0): Promise<any> {
  if (!config.fub.apiKey) {
    throw new Error('FUB_API_KEY is not set — add it to pulse/server/.env');
  }
  const url = pathAndQuery.startsWith('http')
    ? pathAndQuery
    : `${config.fub.baseUrl}${pathAndQuery}`;

  const headers: Record<string, string> = {
    Authorization: authHeader(),
    Accept: 'application/json',
  };
  if (config.fub.xSystem) headers['X-System'] = config.fub.xSystem;
  if (config.fub.xSystemKey) headers['X-System-Key'] = config.fub.xSystemKey;

  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch (err) {
    if (attempt < 4) {
      await sleep(2000 * (attempt + 1));
      return fubGet(pathAndQuery, attempt + 1);
    }
    throw new Error(`FUB request failed (network): ${String((err as Error)?.message ?? err)}`);
  }

  if (res.status === 429 && attempt < 6) {
    const retryAfter = Number(res.headers.get('Retry-After') ?? '5');
    await sleep((Number.isFinite(retryAfter) ? retryAfter : 5) * 1000 + 500);
    return fubGet(pathAndQuery, attempt + 1);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`FUB API ${res.status} ${res.statusText} on ${url}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

/**
 * Yields successive pages of a FUB list endpoint. The caller decides when to
 * stop iterating, which lets sync routines short-circuit once they reach data
 * older than the requested window.
 */
export async function* fubPages<T>(
  endpoint: string,
  collection: string,
  query: Record<string, string | number>,
): AsyncGenerator<T[]> {
  const limit = config.sync.pageSize;
  let offset = 0;

  // Hard cap so a misbehaving response can never loop forever.
  for (let page = 0; page < 5000; page++) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) params.set(k, String(v));
    params.set('limit', String(limit));
    params.set('offset', String(offset));

    const data = await fubGet(`${endpoint}?${params.toString()}`);
    const items: T[] = Array.isArray(data?.[collection]) ? data[collection] : [];
    if (items.length === 0) break;

    yield items;

    offset += items.length;
    const total = Number(data?._metadata?.total ?? 0);
    if (total > 0 && offset >= total) break;
    if (items.length < limit) break;

    await sleep(250); // be polite to the API
  }
}

export function fetchUsers(): AsyncGenerator<FubUser[]> {
  return fubPages<FubUser>('/users', 'users', {});
}

/** Calls are requested newest-first so sync can stop early once past the window. */
export function fetchCalls(): AsyncGenerator<FubCall[]> {
  return fubPages<FubCall>('/calls', 'calls', { sort: '-created' });
}

/** Deals are fully re-synced each run so status changes (won/lost) are caught. */
export function fetchDeals(): AsyncGenerator<FubDeal[]> {
  return fubPages<FubDeal>('/deals', 'deals', { sort: '-created' });
}
