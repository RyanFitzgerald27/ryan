import { Routes } from '@angular/router';
import { PlaceholderComponent } from './features/placeholder.component';

// Helper to keep the routes file readable.
const ph = (section: string, title: string, blurb: string) => ({
  component: PlaceholderComponent,
  data: { section, title, blurb },
});

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

  // WORK
  { path: 'dashboard', ...ph('Work', 'Dashboard', 'Personalized overview: open deals, today\'s deadlines, alerts.') },
  { path: 'inbox', ...ph('Work', 'Inbox', 'Unified messages, mentions, approval requests.') },
  { path: 'tasks', ...ph('Work', 'Tasks', 'Per-user tasks across transactions, recruiting, training.') },
  { path: 'calendar', ...ph('Work', 'Calendar', 'Showings, deadlines, closings, training events.') },
  { path: 'leads', ...ph('Work', 'Leads', 'Lead pipeline (existing AgentLoft CRM module — integrates here).') },
  { path: 'deals', ...ph('Work', 'Deals', 'Transaction pipeline. Module being fully built — see /modules/transactions.') },
  { path: 'goals', ...ph('Work', 'Goals', 'Production goals + progress tracking per agent.') },
  { path: 'me', ...ph('Work', 'My Profile', 'Personal license, E&O, ICA, payout info.') },

  // OPERATIONS
  { path: 'operations/agents/roster', ...ph('Operations', 'Agent Roster', 'Active agents, statuses, search.') },
  { path: 'operations/agents/onboarding', ...ph('Operations', 'Onboarding', 'New-agent checklist + status.') },
  { path: 'operations/agents/licensing', ...ph('Operations', 'Licensing & E&O', 'License renewals, expirations, E&O coverage.') },
  { path: 'operations/agents/cap-plans', ...ph('Operations', 'Cap Plans', 'Brokerage cap structures + per-agent progress.') },
  { path: 'operations/recruiting', ...ph('Operations', 'Recruiting', 'Prospect pipeline, attribution, notes.') },
  { path: 'operations/commissions/cdas', ...ph('Operations', 'CDAs', 'Commission disbursement authorizations.') },
  { path: 'operations/commissions/payouts', ...ph('Operations', 'Payouts', 'Scheduled and historical payouts.') },
  { path: 'operations/commissions/ledgers', ...ph('Operations', 'Agent Ledgers', 'Per-agent gross / fees / net.') },
  { path: 'operations/commissions/referrals', ...ph('Operations', 'Referrals', 'Referrals in / out.') },
  { path: 'operations/vendors', ...ph('Operations', 'Vendors', 'Lender, title, inspectors, photographers, etc.') },
  { path: 'operations/documents', ...ph('Operations', 'Documents', 'Brokerage forms, signed agent docs, e-sign.') },
  { path: 'operations/training', ...ph('Operations', 'Training', 'Courses, completion tracking, required-by-role.') },
  { path: 'operations/compliance', ...ph('Operations', 'Compliance', 'File review, disclosures, audit checklist.') },
  { path: 'operations/marketing', ...ph('Operations', 'Marketing Ops', 'Marketing requests → fulfillment workflow.') },
  { path: 'operations/announcements', ...ph('Operations', 'Announcements', 'Broadcast email/SMS to agents.') },

  // GROWTH
  { path: 'growth/website/listings', ...ph('Growth', 'Listing pages', 'Existing AgentLoft listings module.') },
  { path: 'growth/website/communities', ...ph('Growth', 'Community pages', 'Existing AgentLoft community pages.') },
  { path: 'growth/website/builder', ...ph('Growth', 'Page builder', 'Existing AgentLoft page builder.') },
  { path: 'growth/website/blog', ...ph('Growth', 'Blog', 'Existing AgentLoft blog.') },
  { path: 'growth/website/resources', ...ph('Growth', 'Resources', 'Existing AgentLoft resources.') },
  { path: 'growth/campaigns', ...ph('Growth', 'Campaigns', 'Email/SMS campaigns to leads.') },
  { path: 'growth/lead-sources', ...ph('Growth', 'Lead Sources', 'Attribution config + spend ROI.') },

  // INTELLIGENCE
  { path: 'intelligence/reporting/production', ...ph('Intelligence', 'Production Report', 'Volume, units, GCI by agent / team / office / month.') },
  { path: 'intelligence/reporting/pipeline', ...ph('Intelligence', 'Pipeline Report', 'Deals by stage, conversion rates.') },
  { path: 'intelligence/reporting/lead-sources', ...ph('Intelligence', 'Lead Source Report', 'Attribution + ROI by source.') },
  { path: 'intelligence/reporting/financial', ...ph('Intelligence', 'Financial Report', 'Revenue, fees, AR/AP. Restricted role.') },
  { path: 'intelligence/reporting/recruiting', ...ph('Intelligence', 'Recruiting Report', 'Prospect funnel + recruiter performance.') },
  { path: 'intelligence/reporting/custom', ...ph('Intelligence', 'Custom Reports', 'Saved views, ad-hoc queries.') },
  { path: 'intelligence/pond', ...ph('Intelligence', 'Pond', 'Stale or unassigned leads.') },
  { path: 'intelligence/insights', ...ph('Intelligence', 'Insights', 'AI-generated weekly digest, anomaly detection.') },

  // ADMIN
  { path: 'admin/org', ...ph('Admin', 'Organization', 'Brokerages, offices, teams.') },
  { path: 'admin/users', ...ph('Admin', 'Users & Roles', 'RBAC, custom roles, permission overrides.') },
  { path: 'admin/integrations', ...ph('Admin', 'Integrations', 'MLS, FUB/Sierra, QuickBooks, Resend, Twilio, dotloop.') },
  { path: 'admin/billing', ...ph('Admin', 'Billing', 'Subscription, invoices.') },
  { path: 'admin/audit', ...ph('Admin', 'Audit Log', 'Cross-module event log.') },
  { path: 'admin/flags', ...ph('Admin', 'Feature Flags', 'Per-brokerage feature flags.') },
  { path: 'admin/api-keys', ...ph('Admin', 'API Keys & Webhooks', 'Programmatic access for the brokerage.') },

  { path: '**', redirectTo: 'dashboard' },
];
