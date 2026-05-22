import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from './api.service';
import { SyncService } from './sync.service';
import { DealsChartComponent } from './deals-chart.component';
import {
  AppConfig,
  DealAgentStat,
  DealRow,
  DealSummary,
  DealTrendPoint,
  PipelineStage,
  RangeMeta,
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
  selector: 'app-deals',
  imports: [DealsChartComponent],
  templateUrl: './deals.component.html',
  styleUrl: './deals.component.scss',
})
export class DealsComponent implements OnInit {
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

  range = 'year';

  config?: AppConfig;
  rangeMeta?: RangeMeta;
  summary?: DealSummary;
  agents: DealAgentStat[] = [];
  pipeline: PipelineStage[] = [];
  trend: DealTrendPoint[] = [];
  deals: DealRow[] = [];

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

    this.api.getDealSummary(this.range).subscribe({
      next: (r) => {
        this.summary = r.summary;
        this.rangeMeta = r.range;
      },
      error: (e) => this.fail(e),
    });
    this.api.getDealLeaderboard(this.range).subscribe({
      next: (r) => (this.agents = r.agents),
      error: (e) => this.fail(e),
    });
    this.api.getDealPipeline().subscribe({
      next: (r) => (this.pipeline = r.stages),
      error: (e) => this.fail(e),
    });
    this.api.getDealTrend(this.range).subscribe({
      next: (r) => (this.trend = r.points),
      error: (e) => this.fail(e),
    });
    this.api.getDeals(25).subscribe({
      next: (r) => {
        this.deals = r.deals;
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

  get cards(): StatCard[] {
    const s = this.summary;
    return [
      { label: 'Open Deals', value: this.num(s?.openDeals), icon: 'bi-folder2-open', accent: 'blue' },
      { label: 'Pipeline Value', value: this.money(s?.pipelineValue), icon: 'bi-cash-stack', accent: 'teal' },
      { label: 'Deals Won', value: this.num(s?.wonDeals), icon: 'bi-trophy', accent: 'green' },
      { label: 'Won Volume', value: this.money(s?.wonVolume), icon: 'bi-graph-up-arrow', accent: 'purple' },
      { label: 'Commission', value: this.money(s?.commission), icon: 'bi-coin', accent: 'orange' },
      { label: 'Win Rate', value: this.pct(s?.winRate), icon: 'bi-bullseye', accent: 'slate' },
    ];
  }

  get pipelineMax(): number {
    return this.pipeline.reduce((max, s) => Math.max(max, s.value), 0) || 1;
  }

  barWidth(value: number): string {
    return `${Math.round((value / this.pipelineMax) * 100)}%`;
  }

  num(value: number | null | undefined): string {
    return (value ?? 0).toLocaleString();
  }

  pct(value: number | null | undefined): string {
    return `${Math.round((value ?? 0) * 100)}%`;
  }

  /** Compact money for stat cards, e.g. $1.3M / $540K. */
  money(value: number | null | undefined): string {
    const v = value ?? 0;
    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}K`;
    return `$${Math.round(v)}`;
  }

  /** Full currency for tables. */
  currency(value: number | null | undefined): string {
    return (value ?? 0).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  }

  dateOnly(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

  statusClass(status: string): string {
    return `status-${status}`;
  }
}
