import dotenv from 'dotenv';

dotenv.config();

function str(name: string, def: string): string {
  const v = process.env[name];
  return v === undefined || v === '' ? def : v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (v === undefined || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function list(name: string, def: string[]): string[] {
  const v = process.env[name];
  if (v === undefined || v === '') return def;
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  port: num('PORT', 4000),
  dbPath: str('DB_PATH', './data/pulse.db'),
  corsOrigin: str('CORS_ORIGIN', '*'),
  timezone: str('TIMEZONE', 'America/New_York'),
  fub: {
    apiKey: str('FUB_API_KEY', ''),
    xSystem: str('FUB_X_SYSTEM', ''),
    xSystemKey: str('FUB_X_SYSTEM_KEY', ''),
    baseUrl: str('FUB_BASE_URL', 'https://api.followupboss.com/v1'),
  },
  sync: {
    lookbackDays: num('SYNC_LOOKBACK_DAYS', 365),
    pageSize: Math.min(100, Math.max(1, num('SYNC_PAGE_SIZE', 100))),
    intervalMinutes: num('SYNC_INTERVAL_MINUTES', 0),
  },
  conversation: {
    minSeconds: num('CONVERSATION_MIN_SECONDS', 90),
    outcomes: list('CONVERSATION_OUTCOMES', ['Interested', 'Not Interested', 'Appointment Set']),
  },
};

export function fubConfigured(): boolean {
  return Boolean(config.fub.apiKey);
}
