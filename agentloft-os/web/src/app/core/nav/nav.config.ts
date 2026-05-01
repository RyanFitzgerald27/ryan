import type { Role } from '../auth/current-user.service';

export interface NavItem {
  label: string;
  route?: string;
  icon: string;          // emoji for v0; swap to SVG component when design system lands
  badge?: string;
  badgeStyle?: 'default' | 'urgent' | 'warning';
  roles?: Role[];        // if omitted, all roles see it
  children?: NavItem[];
}

export interface NavSection {
  label: string;
  roles?: Role[];
  items: NavItem[];
}

const ALL: Role[] = [
  'OWNER',
  'BROKER',
  'ADMIN',
  'TRANSACTION_COORDINATOR',
  'ACCOUNTANT',
  'RECRUITER',
  'AGENT',
];

const ADMIN_ROLES: Role[] = ['OWNER', 'BROKER', 'ADMIN'];
const OPS_ROLES: Role[] = ['OWNER', 'BROKER', 'ADMIN', 'TRANSACTION_COORDINATOR', 'ACCOUNTANT'];
const FINANCE_ROLES: Role[] = ['OWNER', 'BROKER', 'ADMIN', 'ACCOUNTANT'];

export const NAV: NavSection[] = [
  {
    label: 'Work',
    items: [
      { label: 'Dashboard', route: '/dashboard', icon: '🏠' },
      { label: 'Inbox', route: '/inbox', icon: '✉️', badge: '12', badgeStyle: 'urgent' },
      { label: 'Tasks', route: '/tasks', icon: '✓', badge: '8' },
      { label: 'Calendar', route: '/calendar', icon: '📅' },
      { label: 'Leads', route: '/leads', icon: '👥', badge: '101.8K' },
      { label: 'Deals', route: '/deals', icon: '🤝', badge: '24' },
      { label: 'Goals', route: '/goals', icon: '🎯' },
      { label: 'My Profile', route: '/me', icon: '👤' },
    ],
  },
  {
    label: 'Operations',
    roles: OPS_ROLES,
    items: [
      {
        label: 'Agents',
        icon: '🧑‍💼',
        roles: OPS_ROLES,
        children: [
          { label: 'Roster', route: '/operations/agents/roster', icon: '•' },
          { label: 'Onboarding', route: '/operations/agents/onboarding', icon: '•' },
          { label: 'Licensing & E&O', route: '/operations/agents/licensing', icon: '•' },
          { label: 'Cap Plans', route: '/operations/agents/cap-plans', icon: '•' },
        ],
      },
      { label: 'Recruiting', route: '/operations/recruiting', icon: '🎯', roles: ['OWNER', 'BROKER', 'ADMIN', 'RECRUITER'] },
      {
        label: 'Commissions',
        icon: '💰',
        roles: FINANCE_ROLES,
        children: [
          { label: 'CDAs', route: '/operations/commissions/cdas', icon: '•' },
          { label: 'Payouts', route: '/operations/commissions/payouts', icon: '•' },
          { label: 'Agent Ledgers', route: '/operations/commissions/ledgers', icon: '•' },
          { label: 'Referrals', route: '/operations/commissions/referrals', icon: '•' },
        ],
      },
      { label: 'Vendors', route: '/operations/vendors', icon: '🔧', roles: OPS_ROLES },
      { label: 'Documents', route: '/operations/documents', icon: '📁', roles: OPS_ROLES },
      { label: 'Training', route: '/operations/training', icon: '🎓' },
      { label: 'Compliance', route: '/operations/compliance', icon: '🛡️', roles: ADMIN_ROLES },
      { label: 'Marketing Ops', route: '/operations/marketing', icon: '📣', roles: OPS_ROLES },
      { label: 'Announcements', route: '/operations/announcements', icon: '📢', roles: ADMIN_ROLES },
    ],
  },
  {
    label: 'Growth',
    roles: ['OWNER', 'BROKER', 'ADMIN'],
    items: [
      {
        label: 'Website',
        icon: '🌐',
        children: [
          { label: 'Listing pages', route: '/growth/website/listings', icon: '•', badge: '38' },
          { label: 'Community pages', route: '/growth/website/communities', icon: '•', badge: '12' },
          { label: 'Page builder', route: '/growth/website/builder', icon: '•' },
          { label: 'Blog', route: '/growth/website/blog', icon: '•' },
          { label: 'Resources', route: '/growth/website/resources', icon: '•' },
        ],
      },
      { label: 'Campaigns', route: '/growth/campaigns', icon: '📨' },
      { label: 'Lead Sources', route: '/growth/lead-sources', icon: '📍' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      {
        label: 'Reporting',
        icon: '📊',
        children: [
          { label: 'Production', route: '/intelligence/reporting/production', icon: '•' },
          { label: 'Pipeline', route: '/intelligence/reporting/pipeline', icon: '•' },
          { label: 'Lead Sources', route: '/intelligence/reporting/lead-sources', icon: '•' },
          { label: 'Financial', route: '/intelligence/reporting/financial', icon: '•', roles: FINANCE_ROLES },
          { label: 'Recruiting', route: '/intelligence/reporting/recruiting', icon: '•', roles: ['OWNER', 'BROKER', 'ADMIN', 'RECRUITER'] },
          { label: 'Custom', route: '/intelligence/reporting/custom', icon: '•' },
        ],
      },
      { label: 'Pond', route: '/intelligence/pond', icon: '🌊', badge: '87', badgeStyle: 'warning' },
      { label: 'Insights', route: '/intelligence/insights', icon: '✨' },
    ],
  },
  {
    label: 'Admin',
    roles: ADMIN_ROLES,
    items: [
      { label: 'Organization', route: '/admin/org', icon: '🏢' },
      { label: 'Users & Roles', route: '/admin/users', icon: '🔑' },
      { label: 'Integrations', route: '/admin/integrations', icon: '🔌' },
      { label: 'Billing', route: '/admin/billing', icon: '💳' },
      { label: 'Audit Log', route: '/admin/audit', icon: '📜' },
      { label: 'Feature Flags', route: '/admin/flags', icon: '🚩' },
      { label: 'API Keys', route: '/admin/api-keys', icon: '🗝️' },
    ],
  },
];

export function filterNavForRole(nav: NavSection[], role: Role): NavSection[] {
  return nav
    .filter((s) => !s.roles || s.roles.includes(role))
    .map((s) => ({
      ...s,
      items: s.items
        .filter((i) => !i.roles || i.roles.includes(role))
        .map((i) => ({
          ...i,
          children: i.children?.filter((c) => !c.roles || c.roles.includes(role)),
        })),
    }))
    .filter((s) => s.items.length > 0);
}
