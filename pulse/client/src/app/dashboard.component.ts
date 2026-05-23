import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from './api.service';
import { SyncService } from './sync.service';
import {
  ActivityRow,
  AppConfig,
  RangeMeta,
  Summary,
  TrendPoint,
} from './models';

interface RangeOption { value: string; label: string; }
interface KpiCell { label: string; value: string; icon: string; accent: string; foot: string; }
type ChannelFilter = null | 'call' | 'text' | 'email';
type DirectionFilter = 'all' | 'in' | 'out';
type SortKey = 'createdAt' | 'agent' | 'channel' | 'duration';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly syncService = inject(SyncService);

  readonly ranges: RangeOption[] = [
    { value: 'today',  label: 'Today' },
    { value: 'week',   label: 'This Week' },
    { value: 'last7',  label: 'Last 7' },
    { value: 'last30', label: 'Last 30' },
    { value: 'month',  label: 'This Month' },
    { value: 'year',   label: 'YTD' },
    { value: 'all',    label: 'All' },
  ];

  range = 'last30';
  channelFilter: ChannelFilter = null;
  directionFilter: DirectionFilter = 'all';
  sortKey: SortKey = 'createdAt';
  sortDir: SortDir = 'desc';

  config?: AppConfig;
  rangeMeta?: RangeMeta;
  summary?: Summary;
  trend: TrendPoint[] = [];
  activity: ActivityRow[] = [];

  loading = false;
  error: string | null = null;

  readonly skeletonRows = Array.from({ length: 8 });

  private querySub?: Subscription;

  ngOnInit(): void {
    this.querySub = this.route.queryParamMap.subscribe((p) => {
      const ch = p.get('channel');
      this.channelFilter = ch === 'call' || ch === 'text' || ch === 'email' ? ch : null;
    });
    this.refreshConfig();
    this.syncService.refresh();
    this.load();
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
  }

  setRange(value: string): void {
    if (this.range === value) return;
    this.range = value;
    this.load();
  }

  setDirection(d: DirectionFilter): void {
    this.directionFilter = d;
  }

  toggleSort(key: SortKey): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = key === 'createdAt' ? 'desc' : 'asc';
    }
  }

  load(): void {
    this.loading = true;
    this.error = null;

    this.api.getSummary(this.range).subscribe({
      next: (r) => { this.summary = r.summary; this.rangeMeta = r.range; },
      error: (e) => this.fail(e),
    });
    this.api.getTrend(this.range).subscribe({
      next: (r) => (this.trend = r.points),
      error: (e) => this.fail(e),
    });
    this.api.getRecentActivity(this.range, 200).subscribe({
      next: (r) => { this.activity = r.activity; this.loading = false; },
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
    this.error = e?.error?.error || e?.message || 'Request failed — is the API server running?';
  }

  // --- header ---
  get headerTitle(): string {
    switch (this.channelFilter) {
      case 'call':  return 'Calls';
      case 'text':  return 'Texts';
      case 'email': return 'Emails';
      default:      return 'All activity';
    }
  }

  get headerSub(): string {
    const r = this.rangeMeta?.label ?? '';
    const s = this.summary;
    if (!s) return r;
    const total = s.calls + s.texts + s.emails;
    return `${this.num(total)} interactions across ${this.num(s.activeAgents)} agents · ${r}`;
  }

  // --- KPI strip ---
  get cards(): KpiCell[] {
    const s = this.summary;
    return [
      { label: 'Calls',         value: this.num(s?.calls),          icon: 'bi-telephone',  accent: 'blue',   foot: 'Logged calls' },
      { label: 'Texts',         value: this.num(s?.texts),          icon: 'bi-chat-text',  accent: 'green',  foot: 'In + outbound' },
      { label: 'Emails',        value: this.num(s?.emails),         icon: 'bi-envelope',   accent: 'purple', foot: 'In + outbound' },
      { label: 'Conversations', value: this.num(s?.conversations),  icon: 'bi-chat-dots',  accent: 'teal',   foot: 'Connects + replies' },
      { label: 'Talk Time',     value: this.duration(s?.talkSeconds),icon: 'bi-stopwatch', accent: 'orange', foot: 'Connected time' },
      { label: 'Active Agents', value: this.num(s?.activeAgents),   icon: 'bi-people',     accent: 'slate',  foot: 'With activity' },
    ];
  }

  // --- table ---
  get filteredActivity(): ActivityRow[] {
    let rows = this.activity;
    if (this.channelFilter) {
      rows = rows.filter((r) => r.channel === this.channelFilter);
    }
    if (this.directionFilter !== 'all') {
      const wantIn = this.directionFilter === 'in';
      rows = rows.filter((r) => !!r.isIncoming === wantIn);
    }
    const dir = this.sortDir === 'asc' ? 1 : -1;
    const key = this.sortKey;
    return [...rows].sort((a, b) => {
      let av: any, bv: any;
      switch (key) {
        case 'createdAt': av = a.createdAt;        bv = b.createdAt;        break;
        case 'agent':     av = a.agentName ?? '';  bv = b.agentName ?? '';  break;
        case 'channel':   av = a.channel;          bv = b.channel;          break;
        case 'duration':  av = a.duration ?? -1;   bv = b.duration ?? -1;   break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return  1 * dir;
      return 0;
    });
  }

  // --- formatting ---
  num(v: number | null | undefined): string {
    return (v ?? 0).toLocaleString();
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
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  }

  fullDateTime(iso: string | null | undefined): string {
    return iso ? new Date(iso).toLocaleString() : 'never';
  }

  relativeTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const diff = Date.now() - Date.parse(iso);
    if (!Number.isFinite(diff) || diff < 0) return this.dateTime(iso);
    const min = Math.round(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    if (d < 7) return `${d}d ago`;
    return this.dateTime(iso);
  }

  initials(name: string | null | undefined): string {
    if (!name) return '–';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  channelIcon(channel: string): string {
    if (channel === 'text') return 'bi-chat-text';
    if (channel === 'email') return 'bi-envelope';
    return 'bi-telephone';
  }

  leadLabel(row: ActivityRow): string {
    return row.personId ? `Contact #${row.personId}` : '—';
  }

  activityDetail(row: ActivityRow): string {
    if (row.channel === 'call') {
      if (row.detail) return row.detail;
      return row.outcome ? `Call · ${row.outcome}` : 'Call';
    }
    return row.detail || (row.channel === 'text' ? 'Text message' : 'Email');
  }

  outcomeBadge(row: ActivityRow): { text: string; cls: string } | null {
    if (row.channel === 'call') {
      const o = (row.outcome || '').toLowerCase();
      if (!o) return null;
      if (o.includes('appoint') || o.includes('interest') && !o.includes('not')) {
        return { text: row.outcome!, cls: 'status-positive' };
      }
      if (o.includes('voicemail')) return { text: 'Voicemail', cls: 'status-info' };
      if (o.includes('no answer') || o.includes('busy')) return { text: row.outcome!, cls: 'status-warning' };
      if (o.includes('not') || o.includes('wrong')) return { text: row.outcome!, cls: 'status-negative' };
      return { text: row.outcome!, cls: 'status-neutral' };
    }
    return row.isIncoming
      ? { text: 'Replied', cls: 'status-positive' }
      : { text: 'Sent', cls: 'status-neutral' };
  }
}
