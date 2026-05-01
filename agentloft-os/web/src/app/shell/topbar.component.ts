import { Component } from '@angular/core';

@Component({
  selector: 'app-topbar',
  standalone: true,
  template: `
    <header class="row-between h-12 shrink-0 border-b border-line bg-canvas px-5">
      <div class="text-sm text-ink-3">AgentLoft OS · v0</div>
      <div class="row gap-2 text-xs text-ink-3">
        <button class="rounded-md border border-line px-2 py-1 hover:bg-canvas-3">Help</button>
        <button class="rounded-md border border-line px-2 py-1 hover:bg-canvas-3">What's new</button>
      </div>
    </header>
  `,
})
export class TopbarComponent {}
