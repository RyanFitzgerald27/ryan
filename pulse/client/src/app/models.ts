export interface RangeMeta {
  name: string;
  label: string;
  start: string;
  end: string;
}

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

export interface TrendPoint {
  date: string;
  calls: number;
  messages: number;
}

export interface ActivityRow {
  channel: string;
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

export interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

export interface DealTrendPoint {
  date: string;
  deals: number;
  volume: number;
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
  totals: { calls: number; agents: number; messages: number; deals: number };
}
