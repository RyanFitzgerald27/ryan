import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { SyncService } from './sync.service';

type ThemeId = 'classic' | 'mono' | 'brokerage';

const THEME_KEY = 'pulse.theme';
const COMPACT_KEY = 'pulse.compact';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  readonly syncService = inject(SyncService);
  private readonly router = inject(Router);

  readonly themes: { id: ThemeId; label: string }[] = [
    { id: 'classic', label: 'Classic' },
    { id: 'mono', label: 'Mono' },
    { id: 'brokerage', label: 'Brokerage' },
  ];

  theme: ThemeId = 'classic';
  compact = false;

  private routeSub?: Subscription;
  currentPath = '/activity';
  currentChannel: string | null = null;

  ngOnInit(): void {
    const savedTheme =
      (typeof localStorage !== 'undefined' &&
        (localStorage.getItem(THEME_KEY) as ThemeId | null)) ||
      null;
    if (savedTheme && this.themes.some((t) => t.id === savedTheme)) {
      this.theme = savedTheme;
    }
    const savedCompact =
      typeof localStorage !== 'undefined' && localStorage.getItem(COMPACT_KEY) === '1';
    this.compact = savedCompact;
    this.applyTheme();
    this.applyCompact();
    this.syncService.refresh();

    this.updateRouteState(this.router.url);
    this.routeSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updateRouteState(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private updateRouteState(url: string): void {
    const [path, query] = url.split('?');
    this.currentPath = path || '/activity';
    this.currentChannel = null;
    if (query) {
      const params = new URLSearchParams(query);
      const ch = params.get('channel');
      if (ch) this.currentChannel = ch;
    }
  }

  isActivityActive(channel: string | null): boolean {
    if (!this.currentPath.startsWith('/activity')) return false;
    return (this.currentChannel ?? null) === channel;
  }

  isDealsActive(): boolean {
    return this.currentPath.startsWith('/deals');
  }

  setTheme(id: ThemeId): void {
    this.theme = id;
    this.applyTheme();
    if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, id);
  }

  toggleCompact(): void {
    this.compact = !this.compact;
    this.applyCompact();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(COMPACT_KEY, this.compact ? '1' : '0');
    }
  }

  triggerSync(): void {
    this.syncService.start();
  }

  get syncChipState(): 'syncing' | 'fresh' | 'stale' | 'never' {
    if (this.syncService.syncing) return 'syncing';
    const finished = this.syncService.status?.lastCallSync?.finished_at;
    if (!finished) return 'never';
    const ageMin = (Date.now() - Date.parse(finished)) / 60000;
    return ageMin <= 30 ? 'fresh' : 'stale';
  }

  get syncChipLabel(): string {
    if (this.syncService.syncing) return 'Syncing…';
    const finished = this.syncService.status?.lastCallSync?.finished_at;
    if (!finished) return 'Not synced';
    return `Synced ${this.relative(finished)}`;
  }

  private relative(iso: string): string {
    const diff = Date.now() - Date.parse(iso);
    const min = Math.round(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return `${d}d ago`;
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') return;
    if (this.theme === 'classic') document.body.removeAttribute('data-theme');
    else document.body.setAttribute('data-theme', this.theme);
  }

  private applyCompact(): void {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('is-compact', this.compact);
  }
}
