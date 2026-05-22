import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ActivityRow,
  AgentStat,
  AppConfig,
  DealAgentStat,
  DealRow,
  DealSummary,
  DealTrendPoint,
  PipelineStage,
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

  // --- Activity (calls & conversations) ---

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

  getRecentActivity(
    range: string,
    limit = 30,
  ): Observable<{ activity: ActivityRow[] }> {
    return this.http.get<{ activity: ActivityRow[] }>(`${this.base}/activity`, {
      params: { range, limit },
    });
  }

  // --- Deals ---

  getDealSummary(
    range: string,
  ): Observable<{ range: RangeMeta; summary: DealSummary }> {
    return this.http.get<{ range: RangeMeta; summary: DealSummary }>(
      `${this.base}/deals/summary`,
      { params: { range } },
    );
  }

  getDealLeaderboard(
    range: string,
  ): Observable<{ range: RangeMeta; agents: DealAgentStat[] }> {
    return this.http.get<{ range: RangeMeta; agents: DealAgentStat[] }>(
      `${this.base}/deals/leaderboard`,
      { params: { range } },
    );
  }

  getDealPipeline(): Observable<{ stages: PipelineStage[] }> {
    return this.http.get<{ stages: PipelineStage[] }>(
      `${this.base}/deals/pipeline`,
    );
  }

  getDealTrend(
    range: string,
  ): Observable<{ range: RangeMeta; points: DealTrendPoint[] }> {
    return this.http.get<{ range: RangeMeta; points: DealTrendPoint[] }>(
      `${this.base}/deals/trend`,
      { params: { range } },
    );
  }

  getDeals(limit = 25): Observable<{ deals: DealRow[] }> {
    return this.http.get<{ deals: DealRow[] }>(`${this.base}/deals/list`, {
      params: { limit },
    });
  }

  // --- Sync ---

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
