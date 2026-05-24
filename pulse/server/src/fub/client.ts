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

/** A person (lead/contact) in Follow Up Boss. Fields are loosely typed because
 *  shapes vary by account. The route layer picks out what the UI needs. */
export interface FubPerson {
  id: number;
  created?: string;
  updated?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  stage?: string;
  source?: string;
  sourceUrl?: string;
  assignedUserId?: number;
  assignedTo?: string;
  emails?: Array<{ value?: string; type?: string; isPrimary?: number | boolean }>;
  phones?: Array<{ value?: string; type?: string; isPrimary?: number | boolean }>;
  addresses?: Array<{ city?: string; state?: string; postalCode?: string }>;
  tags?: string[];
  lastActivity?: string;
  lastCommunication?: string;
  contacted?: number;
  price?: number;
  score?: number;
}

/** A note in FUB attached to a person. */
export interface FubNote {
  id: number;
  personId?: number;
  userId?: number;
  subject?: string;
  body?: string;
  created?: string;
  updated?: string;
  isHtml?: boolean;
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

/** A logged text message in Follow Up Boss. */
export interface FubTextMessage {
  id: number;
  created?: string;
  updated?: string;
  isIncoming?: boolean;
  personId?: number;
  userId?: number;
  message?: string;
  body?: string;
  status?: string;
}

/** A logged email in Follow Up Boss. */
export interface FubEmail {
  id: number;
  created?: string;
  updated?: string;
  isIncoming?: boolean;
  personId?: number;
  userId?: number;
  subject?: string;
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

  // First request uses offset=0; subsequent requests follow `_metadata.nextLink`
  // because FUB disables offset-based pagination past 2000 records.
  const initialParams = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) initialParams.set(k, String(v));
  initialParams.set('limit', String(limit));
  initialParams.set('offset', '0');
  let nextUrl: string | null = `${endpoint}?${initialParams.toString()}`;

  // Hard cap so a misbehaving response can never loop forever.
  for (let page = 0; page < 5000 && nextUrl; page++) {
    const data = await fubGet(nextUrl);
    // `collection` is a hint; fall back to the first array-valued property so
    // the exact key casing FUB returns (e.g. textmessages) does not matter.
    let items: T[] = Array.isArray(data?.[collection]) ? data[collection] : [];
    if (items.length === 0 && data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        if (key !== '_metadata' && Array.isArray(value)) {
          items = value as T[];
          break;
        }
      }
    }
    if (items.length === 0) break;

    yield items;

    const link = data?._metadata?.nextLink;
    nextUrl = typeof link === 'string' && link ? link : null;
    if (!nextUrl && items.length < limit) break;

    await sleep(250); // be polite to the API
  }
}

export function fetchUsers(): AsyncGenerator<FubUser[]> {
  return fubPages<FubUser>('/users', 'users', {});
}

/** Fetches a single person by id. Returns null on 404 so the route can 404 cleanly. */
export async function fetchPerson(id: number): Promise<FubPerson | null> {
  try {
    const data = await fubGet(`/people/${id}`);
    return data as FubPerson;
  } catch (err) {
    const msg = String((err as Error)?.message ?? '');
    if (msg.includes('FUB API 404')) return null;
    throw err;
  }
}

/** Fetches notes for a single person (newest first). Empty array on 404. */
export async function fetchNotesForPerson(personId: number, limit = 50): Promise<FubNote[]> {
  try {
    const params = new URLSearchParams({
      personId: String(personId),
      sort: '-created',
      limit: String(Math.min(100, Math.max(1, limit))),
    });
    const data = await fubGet(`/notes?${params.toString()}`);
    const notes = Array.isArray(data?.notes) ? data.notes : [];
    return notes as FubNote[];
  } catch (err) {
    const msg = String((err as Error)?.message ?? '');
    if (msg.includes('FUB API 404')) return [];
    throw err;
  }
}

/** Calls are requested newest-first so sync can stop early once past the window. */
export function fetchCalls(): AsyncGenerator<FubCall[]> {
  return fubPages<FubCall>('/calls', 'calls', { sort: '-created' });
}

/** Deals are fully re-synced each run so status changes (won/lost) are caught. */
export function fetchDeals(): AsyncGenerator<FubDeal[]> {
  return fubPages<FubDeal>('/deals', 'deals', { sort: '-created' });
}

export function fetchTextMessages(): AsyncGenerator<FubTextMessage[]> {
  return fubPages<FubTextMessage>('/textMessages', 'textmessages', { sort: '-created' });
}

export function fetchEmails(): AsyncGenerator<FubEmail[]> {
  return fubPages<FubEmail>('/emails', 'emails', { sort: '-created' });
}
