import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UiService } from './ui.service';

type ComposerTab = 'note' | 'email' | 'text' | 'call';
type ActivityFilter = 'all' | 'calls' | 'texts' | 'emails' | 'notes' | 'activity' | 'searches';

@Component({
  selector: 'app-lead-detail',
  imports: [],
  templateUrl: './lead-detail.component.html',
  styleUrl: './lead-detail.component.scss',
})
export class LeadDetailComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly ui = inject(UiService);

  composer: ComposerTab = 'note';
  filter: ActivityFilter = 'all';

  get leadId(): string {
    return this.route.snapshot.paramMap.get('id') || 'richard-mitchell';
  }

  setComposer(t: ComposerTab) { this.composer = t; }
  setFilter(f: ActivityFilter) { this.filter = f; }

  back(): void { this.router.navigate(['/leads']); }
}
