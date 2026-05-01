import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CurrentUserService } from '../core/auth/current-user.service';
import { NAV, filterNavForRole, NavItem } from '../core/nav/nav.config';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="flex h-full w-64 flex-col bg-sidebar text-sidebar-text">
      <div class="flex items-center gap-2 px-5 pt-5 pb-4 text-[15px] font-semibold tracking-wider">
        AGENTLOFT
      </div>

      <div class="px-3 pb-3">
        <button
          type="button"
          class="row w-full gap-2 rounded-md bg-sidebar-2 px-3 py-2 text-sm text-sidebar-muted hover:text-sidebar-text"
          (click)="openPalette()"
        >
          <span class="text-base">🔍</span>
          <span class="flex-1 text-left">Search…</span>
          <kbd class="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] tracking-wide">⌘K</kbd>
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto px-2 pb-6">
        @for (section of sections(); track section.label) {
          <div class="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
            {{ section.label }}
          </div>
          @for (item of section.items; track item.label) {
            @if (item.children?.length) {
              <button
                type="button"
                class="row w-full gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-sidebar-hover"
                (click)="toggle(item.label)"
              >
                <span class="text-base">{{ item.icon }}</span>
                <span class="flex-1 text-left">{{ item.label }}</span>
                <span class="text-sidebar-muted text-xs">{{ expanded().has(item.label) ? '▾' : '▸' }}</span>
              </button>
              @if (expanded().has(item.label)) {
                <div class="ml-7 border-l border-white/5 pl-2">
                  @for (child of item.children; track child.label) {
                    <a
                      [routerLink]="child.route"
                      routerLinkActive="bg-sidebar-active text-white"
                      class="row gap-2 rounded-md px-3 py-1.5 text-[13px] text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text"
                    >
                      <span class="flex-1">{{ child.label }}</span>
                      @if (child.badge) {
                        <span class="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">{{ child.badge }}</span>
                      }
                    </a>
                  }
                </div>
              }
            } @else {
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-sidebar-active text-white"
                class="row gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-sidebar-hover"
              >
                <span class="text-base">{{ item.icon }}</span>
                <span class="flex-1">{{ item.label }}</span>
                @if (item.badge) {
                  <span
                    class="rounded px-1.5 py-0.5 text-[10px] font-medium"
                    [class.bg-red-500]="item.badgeStyle === 'urgent'"
                    [class.text-white]="item.badgeStyle === 'urgent' || item.badgeStyle === 'warning'"
                    [class.bg-amber-500]="item.badgeStyle === 'warning'"
                    [class.bg-white\\/10]="!item.badgeStyle || item.badgeStyle === 'default'"
                  >
                    {{ item.badge }}
                  </span>
                }
              </a>
            }
          }
        }
      </nav>

      <div class="border-t border-white/5 px-3 py-3">
        <div class="row gap-3 rounded-md px-2 py-1.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
            {{ initials() }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium text-sidebar-text">{{ user().name }}</div>
            <div class="truncate text-[11px] text-sidebar-muted">
              {{ user().brokerageName }} · {{ roleLabel() }}
            </div>
          </div>
        </div>
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  private readonly currentUser = inject(CurrentUserService);

  readonly user = this.currentUser.user;
  readonly sections = computed(() => filterNavForRole(NAV, this.user().role));
  readonly expanded = signal<Set<string>>(new Set(['Website', 'Reporting']));

  toggle(label: string) {
    const next = new Set(this.expanded());
    next.has(label) ? next.delete(label) : next.add(label);
    this.expanded.set(next);
  }

  initials() {
    const u = this.user();
    return u.name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  }

  roleLabel() {
    const r = this.user().role;
    return r.charAt(0) + r.slice(1).toLowerCase().replace(/_/g, ' ');
  }

  openPalette() {
    // TODO: command palette — see docs/ROADMAP.md
  }
}
