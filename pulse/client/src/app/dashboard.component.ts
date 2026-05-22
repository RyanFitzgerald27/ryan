import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from './api.service';
import { TrendChartComponent } from './trend-chart.component';
import {
  AgentStat,
  AppConfig,
  CallRow,
  RangeMeta,
  Summary,
  SyncStatus,
  TrendPoint,
} from './models';

interface RangeOption {
  value: string;
  label: string;
}

interface StatCard {
  label: string;
  value: string;
  icon: string;
  accent: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [TrendChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly ranges: RangeOption[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'last7', label: 'Last 7 Days' },
    { value: 'last30', label: 'Last 30 Days' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' },
  ];

  range = 'last30';

  config?: AppConfig;
  rangeMeta?: RangeMeta;
  summary?: Summary;
  agents: AgentStat[] = [];
  trend: TrendPoint[] = [];
  calls: CallRow[] = [];
  sync?: SyncStatus;

  loading = false;
  syncing = false;
  error: string | null = null;

  ngOnInit(): void {
    this.refreshConfig();
    this.refreshSync();
    this.load();
  }

  setRange(value: string): void {
    if (this.range === value) return;
    this.range = value;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;

    this.api.getSummary(this.range).subscribe({
      next: (r) => {
        this.summary = r.summary;
        this.rangeMeta = r.range;
      },
      error: (e) => this.fail(e),
    });
    this.api.getLeaderboard(this.range).subscribe({
      next: (r) => (this.agents = r.agents),
      error: (e) => this.fail(e),
    });
    this.api.getTrend(this.range).subscribe({
      next: (r) => (this.trend = r.points),
      error: (e) => this.fail(e),
    });
    this.api.getRecentCalls(this.range, 25).subscribe({
      next: (r) => {
        this.calls = r.calls;
        this.loading = false;
      },
      error: (e) => this.fail(e),
    });
  }

  refreshConfig(): void {
    this.api.getConfig().subscribe({ next: (c) => (this.config = c) });
  }

  refreshSync(): void {
    this.api.getSyncStatus().subscribe({ next: (s) => (this.sync = s) });
  }

  syncNow(): void {
    if (this.syncing) return;
    this.syncing = true;
    this.error = null;
    this.api.triggerSync().subscribe({
      next: () => this.pollSync(),
      error: (e) => {
        this.syncing = false;
        this.fail(e);
      },
    });
  }

  private pollSync(): void {
    this.api.getSyncStatus().subscribe({
      next: (s) => {
        this.sync = s;
        if (s.running) {
          setTimeout(() => this.pollSync(), 2500);
        } else {
          this.syncing = false;
          if (s.lastError) this.error = s.lastError;
          this.refreshConfig();
          this.load();
        }
      },
      error: (e) => {
        this.syncing = false;
        this.fail(e);
      },
    });
  }

  private fail(e: any): void {
    this.loading = false;
    this.error =
      e?.error?.error || e?.message || 'Request failed — is the API server running?';
  }

  get cards(): StatCard[] {
    const s = this.summary;
    return [
      { label: 'Total Calls', value: this.num(s?.calls), icon: 'bi-telephone', accent: 'blue' },
      { label: 'Conversations', value: this.num(s?.conversations), icon: 'bi-chat-dots', accent: 'green' },
      { label: 'Conversation Rate', value: this.pct(s?.conversationRate), icon: 'bi-graph-up-arrow', accent: 'teal' },
      { label: 'Talk Time', value: this.duration(s?.talkSeconds), icon: 'bi-stopwatch', accent: 'purple' },
      { label: 'Outbound Calls', value: this.num(s?.outbound), icon: 'bi-telephone-outbound', accent: 'orange' },
      { label: 'Active Agents', value: this.num(s?.activeAgents), icon: 'bi-people', accent: 'slate' },
    ];
  }

  num(value: number | null | undefined): string {
    return (value ?? 0).toLocaleString();
  }

  pct(value: number | null | undefined): string {
    return `${Math.round((value ?? 0) * 100)}%`;
  }

  duration(seconds: number | null | undefined): string {
    const total = Math.max(0, Math.round(seconds ?? 0));
    if (total === 0) return '0s';
    if (total < 60) return `${total}s`;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${m}m`;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }

  dateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  fullDateTime(iso: string | null | undefined): string {
    if (!iso) return 'never';
    return new Date(iso).toLocaleString();
  }

  rankClass(rank: number): string {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return '';
  }
}
