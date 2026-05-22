import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { SyncStatus } from './models';

/**
 * Shared sync state for the whole app. A sync (agents + calls + deals) runs on
 * the server; this service triggers it, polls until it finishes, and exposes
 * the status so both the Activity and Deals pages stay in step.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly api = inject(ApiService);

  status?: SyncStatus;
  syncing = false;
  error: string | null = null;

  refresh(): void {
    this.api.getSyncStatus().subscribe({ next: (s) => (this.status = s) });
  }

  /** Triggers a sync and resolves once it has finished (or failed). */
  start(): Promise<void> {
    if (this.syncing) return Promise.resolve();
    this.syncing = true;
    this.error = null;

    return new Promise<void>((resolve) => {
      this.api.triggerSync().subscribe({
        next: () => this.poll(resolve),
        error: (e) => {
          this.syncing = false;
          this.error = this.message(e);
          resolve();
        },
      });
    });
  }

  private poll(done: () => void): void {
    this.api.getSyncStatus().subscribe({
      next: (s) => {
        this.status = s;
        if (s.running) {
          setTimeout(() => this.poll(done), 2500);
        } else {
          this.syncing = false;
          if (s.lastError) this.error = s.lastError;
          done();
        }
      },
      error: (e) => {
        this.syncing = false;
        this.error = this.message(e);
        done();
      },
    });
  }

  private message(e: any): string {
    return e?.error?.error || e?.message || 'Sync request failed.';
  }
}
