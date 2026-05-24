import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

interface Lead {
  id: string;
  name: string;
  src: string;
  created: string;
  stage: 'Lead' | 'Hot' | 'Active';
  visit: string;
  calls: number;
  price: number | null;
  phone: string;
  phoneBad: boolean;
  email: string;
  activity: 'Viewed' | 'Registered' | 'Replied';
  sel?: boolean;
  avatarColor: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly router = inject(Router);

  railCollapsed = true;

  readonly leads: Lead[] = [
    { id: 'richard-mitchell', name: 'Richard Mitchell', src: 'raleighrealty.com', created: '34 minutes ago', stage: 'Lead', visit: '26 minutes ago', calls: 0, price: 894024, phone: '(602) 653-6083', phoneBad: false, email: 'rmit403@gmail.com',          activity: 'Viewed',     sel: true, avatarColor: '#c2998a' },
    { id: 'pervis-caldwell',  name: 'PERVIS J Caldwell',  src: 'raleighrealty.com', created: 'an hour ago',    stage: 'Lead', visit: 'an hour ago',    calls: 0, price: null,   phone: '',                phoneBad: false, email: '2brothers1mind@gmail.com',   activity: 'Viewed',     avatarColor: '#d4b87a' },
    { id: 'jatoria-lewis',    name: 'Jatoria Lewis',      src: 'raleighrealty.com', created: 'an hour ago',    stage: 'Lead', visit: '22 minutes ago', calls: 0, price: 404990, phone: '(984) 222-4382', phoneBad: false, email: 'jatorialewis00@gmail.com',   activity: 'Viewed',     avatarColor: '#a7b87a' },
    { id: 'taylor-marshall',  name: 'Taylor Marshall',    src: 'raleighrealty.com', created: 'an hour ago',    stage: 'Lead', visit: 'an hour ago',    calls: 2, price: 1100000,phone: '(919) 770-7864', phoneBad: false, email: 'taylor.marshall1012@gmail.com', activity: 'Viewed',   avatarColor: '#7aa2b8' },
    { id: 'deb-golden',       name: 'Deb Golden',         src: 'raleighrealty.com', created: '2 hours ago',    stage: 'Lead', visit: '2 hours ago',    calls: 2, price: 450000, phone: '(719) 596-7063', phoneBad: false, email: 'debgolden14@yahoo.com',       activity: 'Viewed',     avatarColor: '#9a8ec2' },
    { id: 'leonid-loutsenko', name: 'Leonid Loutsenko',   src: 'raleighrealty.com', created: '2 hours ago',    stage: 'Lead', visit: '2 hours ago',    calls: 0, price: null,   phone: '',                phoneBad: false, email: 'loutsenkoleonid@gmail.com',   activity: 'Viewed',     avatarColor: '#c28a8a' },
    { id: 'sue-fazekas',      name: 'Sue Fazekas',        src: 'raleighrealty.com', created: '3 hours ago',    stage: 'Lead', visit: '3 hours ago',    calls: 0, price: 449990, phone: '(919) 342-5942', phoneBad: true,  email: 'sue.fazekas721@gmail.com',    activity: 'Viewed',     avatarColor: '#8ac2a3' },
    { id: 'vanessa-mclaughlin',name: 'Vanessa McLaughlin', src: 'raleighrealty.com', created: '3 hours ago',    stage: 'Lead', visit: '3 hours ago',    calls: 2, price: 579000, phone: '(347) 665-4639', phoneBad: false, email: 'vanessa.a.mclaughlin@gmail.com', activity: 'Viewed', avatarColor: '#c2a48a' },
    { id: 'adena-sexton',     name: 'Adena Sexton',       src: 'raleighrealty.com', created: '3 hours ago',    stage: 'Lead', visit: '3 hours ago',    calls: 0, price: null,   phone: '',                phoneBad: false, email: 'adenasexton@gmail.com',       activity: 'Viewed',     avatarColor: '#7ac2bb' },
    { id: 'blizzard-smith',   name: 'Blizzard Smith',     src: 'raleighrealty.com', created: '3 hours ago',    stage: 'Lead', visit: '3 hours ago',    calls: 0, price: 2600000,phone: '(905) 618-2354', phoneBad: true,  email: 'blizzardinc906@gmail.com',    activity: 'Viewed',     avatarColor: '#c28abb' },
    { id: 'michael-dove',     name: 'Michael Dove',       src: 'raleighrealty.com', created: '4 hours ago',    stage: 'Lead', visit: '4 hours ago',    calls: 0, price: null,   phone: '',                phoneBad: false, email: 'kathryndove94@gmail.com',     activity: 'Registered', avatarColor: '#c2998a' },
    { id: 'jay-harvey',       name: 'Jay Harvey',         src: 'raleighrealty.com', created: '4 hours ago',    stage: 'Lead', visit: '4 hours ago',    calls: 0, price: null,   phone: '',                phoneBad: false, email: 'harveyclan4@gmail.com',       activity: 'Registered', avatarColor: '#d4b87a' },
    { id: 'caroline-truong',  name: 'Caroline Truong',    src: 'raleighrealty.com', created: '5 hours ago',    stage: 'Hot',  visit: '4 hours ago',    calls: 3, price: 675000, phone: '(919) 555-2384', phoneBad: false, email: 'caroline.t@gmail.com',        activity: 'Replied',    avatarColor: '#a7b87a' },
    { id: 'marcus-webb',      name: 'Marcus Webb',        src: 'raleighrealty.com', created: '6 hours ago',    stage: 'Lead', visit: '5 hours ago',    calls: 1, price: 525000, phone: '(984) 222-9182', phoneBad: false, email: 'mwebb1@outlook.com',          activity: 'Viewed',     avatarColor: '#7aa2b8' },
  ];

  toggleRail(): void {
    this.railCollapsed = !this.railCollapsed;
  }

  openLead(lead: Lead): void {
    this.router.navigate(['/leads', lead.id]);
  }

  initials(name: string): string {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  fmtPrice(p: number | null): string {
    return p == null ? '' : '$' + p.toLocaleString();
  }

  stageClass(stage: string): string {
    return stage.toLowerCase();
  }

  activityClass(a: string): string {
    if (a === 'Viewed') return 'eye';
    if (a === 'Replied') return 'reply';
    return 'reg';
  }

  activityIcon(a: string): string {
    if (a === 'Viewed') return 'bi-eye';
    if (a === 'Replied') return 'bi-chat-dots';
    return 'bi-check2-circle';
  }
}
