import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from './api.service';
import { Lead, LeadEvent, LeadEventCounts } from './models';
import { UiService } from './ui.service';

type ComposerTab = 'note' | 'email' | 'text' | 'call';
type ActivityFilter = 'all' | 'calls' | 'texts' | 'emails' | 'notes' | 'activity' | 'searches';

const POLL_MS = 30_000;

@Component({
  selector: 'app-lead-detail',
  imports: [CommonModule, FormsModule],
  templateUrl: './lead-detail.component.html',
  styleUrl: './lead-detail.component.scss',
})
export class LeadDetailComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  readonly ui = inject(UiService);

  composer: ComposerTab = 'note';
  filter: ActivityFilter = 'all';

  readonly lead = signal<Lead | null>(null);
  readonly events = signal<LeadEvent[]>([]);
  readonly counts = signal<LeadEventCounts>({ total: 0, call: 0, text: 0, email: 0, note: 0 });
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly filteredEvents = computed(() => {
    const all = this.events();
    switch (this.filter) {
      case 'calls': return all.filter((e) => e.kind === 'call');
      case 'texts': return all.filter((e) => e.kind === 'text');
      case 'emails': return all.filter((e) => e.kind === 'email');
      case 'notes': return all.filter((e) => e.kind === 'note');
      case 'activity':
      case 'searches':
        return [] as LeadEvent[];
      default: return all;
    }
  });

  private pollHandle: ReturnType<typeof setInterval> | null = null;

  get leadId(): string {
    return this.route.snapshot.paramMap.get('id') || '';
  }

  get isLiveId(): boolean {
    return /^\d+$/.test(this.leadId);
  }

  ngOnInit(): void {
    if (!this.isLiveId) return;
    this.loading.set(true);
    this.refresh(true);
    this.pollHandle = setInterval(() => this.refresh(false), POLL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollHandle) clearInterval(this.pollHandle);
  }

  private refresh(initial: boolean): void {
    const id = this.leadId;
    this.api.getPerson(id).subscribe({
      next: (res) => {
        const current = this.lead();
        const next = res.person;
        // Don't overwrite an in-flight local edit to targetBuyDate.
        if (current && current.targetBuyDate !== next.targetBuyDate && !initial) {
          next.targetBuyDate = current.targetBuyDate;
        }
        this.lead.set(next);
        if (initial) this.loading.set(false);
      },
      error: (err) => {
        if (initial) {
          this.error.set(err?.error?.error ?? err?.message ?? 'Failed to load lead');
          this.loading.set(false);
        }
      },
    });
    this.api.getPersonEvents(id).subscribe({
      next: (res) => {
        this.events.set(res.events);
        this.counts.set(res.counts);
      },
      error: () => { /* swallow on poll */ },
    });
  }

  onTargetBuyDateChange(value: string): void {
    const lead = this.lead();
    if (!lead) return;
    const next = value || null;
    this.lead.set({ ...lead, targetBuyDate: next });
    this.api.updateLeadMetadata(lead.id, { targetBuyDate: next }).subscribe({
      error: (err) => {
        this.error.set(err?.error?.error ?? err?.message ?? 'Failed to save date');
      },
    });
  }

  initials(): string {
    const l = this.lead();
    if (!l) return '';
    const first = (l.firstName ?? l.name ?? '').trim();
    const last = (l.lastName ?? '').trim();
    if (first && last) return (first[0] + last[0]).toUpperCase();
    const name = (l.name ?? first).trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (parts[0]?.slice(0, 2) ?? '').toUpperCase();
  }

  relativeTime(iso: string | null): string {
    if (!iso) return '';
    const then = Date.parse(iso);
    if (!Number.isFinite(then)) return '';
    const diffMs = Date.now() - then;
    const sec = Math.round(diffMs / 1000);
    if (sec < 60) return 'just now';
    const min = Math.round(sec / 60);
    if (min < 60) return `${min} min ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
    const day = Math.round(hr / 24);
    if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`;
    const mo = Math.round(day / 30);
    if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
    const yr = Math.round(mo / 12);
    return `${yr} year${yr === 1 ? '' : 's'} ago`;
  }

  formatPrice(p: number | null): string {
    if (p == null || !Number.isFinite(p)) return '';
    return '$' + Math.round(p).toLocaleString();
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  formatDuration(sec: number | null): string {
    if (sec == null || sec <= 0) return '';
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
  }

  eventIcon(kind: LeadEvent['kind']): string {
    switch (kind) {
      case 'call': return 'bi-telephone-fill';
      case 'text': return 'bi-chat-text-fill';
      case 'email': return 'bi-envelope-fill';
      case 'note': return 'bi-pin-angle-fill';
    }
  }

  eventAvatar(e: LeadEvent): string {
    if (!e.agentName) return '?';
    const parts = e.agentName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
  }

  setComposer(t: ComposerTab) { this.composer = t; }
  setFilter(f: ActivityFilter) { this.filter = f; }

  back(): void { this.router.navigate(['/leads']); }
}
