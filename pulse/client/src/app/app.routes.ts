import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { DealsComponent } from './deals.component';

export const routes: Routes = [
  { path: '', redirectTo: 'activity', pathMatch: 'full' },
  { path: 'activity', component: DashboardComponent, title: 'Activity — Pulse' },
  { path: 'deals', component: DealsComponent, title: 'Deals — Pulse' },
  { path: '**', redirectTo: 'activity' },
];
