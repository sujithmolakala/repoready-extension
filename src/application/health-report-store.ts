import type {
  HealthReport,
  HealthReportState,
} from "../domain/models/healthReport";
import { emptyHealthReportState } from "../domain/models/healthReport";
import type { RepositoryInsights } from "../domain/insights/types";
import type { ScoreTrend } from "../domain/models/healthHistory";

export class HealthReportStore {
  private readonly stateByTabId = new Map<number, HealthReportState>();

  get(tabId: number): HealthReportState {
    return this.stateByTabId.get(tabId) ?? emptyHealthReportState;
  }

  setLoading(tabId: number, key: string): void {
    this.stateByTabId.set(tabId, {
      repositoryKey: key,
      report: null,
      insights: null,
      trend: null,
      isLoading: true,
      error: null,
    });
  }

  setAnalysis(
    tabId: number,
    key: string,
    report: HealthReport,
    insights: RepositoryInsights,
    trend: ScoreTrend,
  ): void {
    this.stateByTabId.set(tabId, {
      repositoryKey: key,
      report,
      insights,
      trend,
      isLoading: false,
      error: null,
    });
  }

  setError(tabId: number, key: string | null, error: string): void {
    this.stateByTabId.set(tabId, {
      repositoryKey: key,
      report: null,
      insights: null,
      trend: null,
      isLoading: false,
      error,
    });
  }

  clear(tabId: number): void {
    this.stateByTabId.delete(tabId);
  }
}
