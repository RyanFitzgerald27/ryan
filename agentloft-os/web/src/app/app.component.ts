import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shell/sidebar.component';
import { TopbarComponent } from './shell/topbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="flex h-screen w-screen overflow-hidden bg-canvas-2">
      <app-sidebar class="shrink-0" />
      <div class="flex min-w-0 flex-1 flex-col">
        <app-topbar />
        <main class="flex-1 overflow-y-auto bg-canvas">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AppComponent {}
