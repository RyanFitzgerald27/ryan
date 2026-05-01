import { Injectable, signal } from '@angular/core';

export type Role =
  | 'OWNER'
  | 'BROKER'
  | 'ADMIN'
  | 'TRANSACTION_COORDINATOR'
  | 'ACCOUNTANT'
  | 'RECRUITER'
  | 'AGENT';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  brokerageName: string;
}

// Stub — to be replaced with AgentLoft's real auth wiring.
@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  readonly user = signal<CurrentUser>({
    id: 'usr_demo',
    name: 'Ryan Fitzgerald',
    email: 'ryan@raleighrealty.com',
    role: 'OWNER',
    brokerageName: 'Raleigh Realty',
  });

  hasRole(roles: Role[]): boolean {
    return roles.includes(this.user().role);
  }
}
