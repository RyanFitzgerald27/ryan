import { Injectable } from '@angular/core';

const COLLAPSE_KEY = 'agentloft.sidebarCollapsed';

/** Shared UI state (sidebar collapsed, etc.) accessible from any component. */
@Injectable({ providedIn: 'root' })
export class UiService {
  sideCollapsed = false;

  constructor() {
    if (typeof localStorage !== 'undefined') {
      this.sideCollapsed = localStorage.getItem(COLLAPSE_KEY) === '1';
    }
  }

  toggleSide(): void {
    this.sideCollapsed = !this.sideCollapsed;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(COLLAPSE_KEY, this.sideCollapsed ? '1' : '0');
    }
  }
}
