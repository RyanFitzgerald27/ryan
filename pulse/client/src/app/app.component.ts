import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { SyncService } from './sync.service';

const COLLAPSE_KEY = 'agentloft.sidebarCollapsed';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  readonly syncService = inject(SyncService);
  private readonly router = inject(Router);

  sideCollapsed = false;
  currentPath = '/leads';

  private sub?: Subscription;

  ngOnInit(): void {
    if (typeof localStorage !== 'undefined') {
      this.sideCollapsed = localStorage.getItem(COLLAPSE_KEY) === '1';
    }
    this.syncService.refresh();
    this.updatePath(this.router.url);
    this.sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updatePath(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  toggleSide(): void {
    this.sideCollapsed = !this.sideCollapsed;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(COLLAPSE_KEY, this.sideCollapsed ? '1' : '0');
    }
  }

  private updatePath(url: string): void {
    this.currentPath = url.split('?')[0] || '/leads';
  }

  isActive(prefix: string): boolean {
    return this.currentPath.startsWith(prefix);
  }
}
