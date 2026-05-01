import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  template: `
    <div class="mx-auto max-w-3xl px-8 py-12">
      <div class="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{{ section }}</div>
      <h1 class="mt-1 text-2xl font-semibold text-ink">{{ title }}</h1>
      <p class="mt-3 text-sm text-ink-2">{{ blurb }}</p>

      <div class="mt-8 rounded-lg border border-dashed border-line-2 bg-canvas-2 p-6">
        <div class="text-sm font-medium text-ink">Module spec</div>
        <p class="mt-1 text-sm text-ink-3">
          This screen is scaffolded as part of the v0 handoff. See
          <code class="rounded bg-canvas-3 px-1.5 py-0.5 text-[12px] text-ink">docs/ROADMAP.md</code>
          for what to build, and the matching <code class="rounded bg-canvas-3 px-1.5 py-0.5 text-[12px] text-ink">MODULE_SPEC.md</code>
          for data model + screens.
        </p>
      </div>
    </div>
  `,
})
export class PlaceholderComponent {
  @Input() section = '';
  @Input() title = '';
  @Input() blurb = '';
}
