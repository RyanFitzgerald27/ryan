import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { LeadDetailComponent } from './lead-detail.component';
import { DealsComponent } from './deals.component';

export const routes: Routes = [
  { path: '', redirectTo: 'leads', pathMatch: 'full' },
  { path: 'leads', component: DashboardComponent, title: 'Leads — AgentLoft' },
  { path: 'leads/:id', component: LeadDetailComponent, title: 'Lead — AgentLoft' },
  { path: 'deals', component: DealsComponent, title: 'Deals — AgentLoft' },
  { path: '**', redirectTo: 'leads' },
];
