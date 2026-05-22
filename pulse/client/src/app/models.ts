export interface RangeMeta {
  name: string;
  label: string;
  start: string;
  end: string;
}

export interface Summary {
  calls: number;
  conversations: number;
  conversationRate: number;
  talkSeconds: number;
  outbound: number;
  inbound: number;
  activeAgents: number;
}

export interface AgentStat {
  rank: number;
  agentId: number | null;
  agentName: string;
  calls: number;
  conversations: number;
  conversationRate: number;
  talkSeconds: number;
}

export interface TrendPoint {
  date: string;
  calls: number;
  conversations: number;
}

export interface CallRow {
  id: number;
  agentId: number | null;
  agentName: string | null;
  personId: number | null;
  phone: string | null;
  isIncoming: number;
  duration: number;
  outcome: string | null;
  note: string | null;
  createdAt: string;
  isConversation: number;
}

export interface SyncRun {
  id: number;
  entity: string;
  started_at: string;
  finished_at: string | null;
  records: number;
  status: string;
  message: string | null;
}

export interface SyncStatus {
  running: boolean;
  lastError: string | null;
  lastFinishedAt: string | null;
  runs: SyncRun[];
  lastCallSync: SyncRun | null;
}

export interface AppConfig {
  fubConfigured: boolean;
  timezone: string;
  conversation: { minSeconds: number; outcomes: string[] };
  autoSyncMinutes: number;
  totals: { calls: number; agents: number };
}
