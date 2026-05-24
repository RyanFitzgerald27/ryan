import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { SyncService } from './sync.service';
import { UiService } from './ui.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  readonly syncService = inject(SyncService);
  readonly ui = inject(UiService);
  private readonly router = inject(Router);

  currentPath = '/leads';
  private sub?: Subscription;

  ngOnInit(): void {
    this.syncService.refresh();
    this.updatePath(this.router.url);
    this.sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updatePath(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private updatePath(url: string): void {
    this.currentPath = url.split('?')[0] || '/leads';
  }

  isActive(prefix: string): boolean {
    return this.currentPath.startsWith(prefix);
  }
}
