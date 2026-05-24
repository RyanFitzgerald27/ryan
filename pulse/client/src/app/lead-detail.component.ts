import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from './api.service';
import { Lead } from './models';
import { UiService } from './ui.service';

type ComposerTab = 'note' | 'email' | 'text' | 'call';
type ActivityFilter = 'all' | 'calls' | 'texts' | 'emails' | 'notes' | 'activity' | 'searches';

@Component({
  selector: 'app-lead-detail',
  imports: [CommonModule],
  templateUrl: './lead-detail.component.html',
  styleUrl: './lead-detail.component.scss',
})
export class LeadDetailComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  readonly ui = inject(UiService);

  composer: ComposerTab = 'note';
  filter: ActivityFilter = 'all';

  readonly lead = signal<Lead | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  get leadId(): string {
    return this.route.snapshot.paramMap.get('id') || '';
  }

  ngOnInit(): void {
    const id = this.leadId;
    if (!id || !/^\d+$/.test(id)) return;
    this.loading.set(true);
    this.api.getPerson(id).subscribe({
      next: (res) => {
        this.lead.set(res.person);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? err?.message ?? 'Failed to load lead');
        this.loading.set(false);
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

  setComposer(t: ComposerTab) { this.composer = t; }
  setFilter(f: ActivityFilter) { this.filter = f; }

  back(): void { this.router.navigate(['/leads']); }
}
