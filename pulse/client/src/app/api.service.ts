import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AgentStat,
  AppConfig,
  CallRow,
  RangeMeta,
  Summary,
  SyncStatus,
  TrendPoint,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  getConfig(): Observable<AppConfig> {
    return this.http.get<AppConfig>(`${this.base}/config`);
  }

  getSummary(range: string): Observable<{ range: RangeMeta; summary: Summary }> {
    return this.http.get<{ range: RangeMeta; summary: Summary }>(
      `${this.base}/summary`,
      { params: { range } },
    );
  }

  getLeaderboard(
    range: string,
  ): Observable<{ range: RangeMeta; agents: AgentStat[] }> {
    return this.http.get<{ range: RangeMeta; agents: AgentStat[] }>(
      `${this.base}/leaderboard`,
      { params: { range } },
    );
  }

  getTrend(range: string): Observable<{ range: RangeMeta; points: TrendPoint[] }> {
    return this.http.get<{ range: RangeMeta; points: TrendPoint[] }>(
      `${this.base}/trend`,
      { params: { range } },
    );
  }

  getRecentCalls(range: string, limit = 25): Observable<{ calls: CallRow[] }> {
    return this.http.get<{ calls: CallRow[] }>(`${this.base}/calls`, {
      params: { range, limit },
    });
  }

  getSyncStatus(): Observable<SyncStatus> {
    return this.http.get<SyncStatus>(`${this.base}/sync/status`);
  }

  triggerSync(): Observable<{ started: boolean; message: string }> {
    return this.http.post<{ started: boolean; message: string }>(
      `${this.base}/sync`,
      {},
    );
  }
}
