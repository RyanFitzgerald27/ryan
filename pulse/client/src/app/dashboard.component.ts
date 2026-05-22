import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from './api.service';
import { SyncService } from './sync.service';
import { TrendChartComponent } from './trend-chart.component';
import {
  ActivityRow,
  AgentStat,
  AppConfig,
  RangeMeta,
  Summary,
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
  readonly syncService = inject(SyncService);

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
  activity: ActivityRow[] = [];

  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.refreshConfig();
    this.syncService.refresh();
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
    this.api.getRecentActivity(this.range, 30).subscribe({
      next: (r) => {
        this.activity = r.activity;
        this.loading = false;
      },
      error: (e) => this.fail(e),
    });
  }

  refreshConfig(): void {
    this.api.getConfig().subscribe({ next: (c) => (this.config = c) });
  }

  sync(): void {
    this.error = null;
    this.syncService.start().then(() => {
      if (this.syncService.error) this.error = this.syncService.error;
      this.refreshConfig();
      this.load();
    });
  }

  private fail(e: any): void {
    this.loading = false;
    this.error =
      e?.error?.error || e?.message || 'Request failed — is the API server running?';
  }

  get hasActivity(): boolean {
    const s = this.summary;
    return !!s && s.calls + s.texts + s.emails > 0;
  }

  get cards(): StatCard[] {
    const s = this.summary;
    return [
      { label: 'Calls', value: this.num(s?.calls), icon: 'bi-telephone', accent: 'blue' },
      { label: 'Texts', value: this.num(s?.texts), icon: 'bi-chat-text', accent: 'teal' },
      { label: 'Emails', value: this.num(s?.emails), icon: 'bi-envelope', accent: 'purple' },
      { label: 'Conversations', value: this.num(s?.conversations), icon: 'bi-chat-dots', accent: 'green' },
      { label: 'Talk Time', value: this.duration(s?.talkSeconds), icon: 'bi-stopwatch', accent: 'orange' },
      { label: 'Active Agents', value: this.num(s?.activeAgents), icon: 'bi-people', accent: 'slate' },
    ];
  }

  num(value: number | null | undefined): string {
    return (value ?? 0).toLocaleString();
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

  channelIcon(channel: string): string {
    if (channel === 'text') return 'bi-chat-text';
    if (channel === 'email') return 'bi-envelope';
    return 'bi-telephone';
  }

  channelClass(channel: string): string {
    if (channel === 'text') return 'text-success';
    if (channel === 'email') return 'text-purple';
    return 'text-primary';
  }

  activityDetail(row: ActivityRow): string {
    if (row.channel === 'call') return row.outcome || 'Call';
    return row.detail || (row.channel === 'text' ? 'Text message' : 'Email');
  }
}
