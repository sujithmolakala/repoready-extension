import type {
  HealthReport,
  HealthReportState,
} from "../domain/models/healthReport";
import { emptyHealthReportState } from "../domain/models/healthReport";

export class HealthReportStore {
  private readonly stateByTabId = new Map<number, HealthReportState>();

  get(tabId: number): HealthReportState {
    return this.stateByTabId.get(tabId) ?? emptyHealthReportState;
  }

  setLoading(tabId: number, key: string): void {
    this.stateByTabId.set(tabId, {
      repositoryKey: key,
      report: null,
      isLoading: true,
      error: null,
    });
  }

  setReport(tabId: number, key: string, report: HealthReport): void {
    this.stateByTabId.set(tabId, {
      repositoryKey: key,
      report,
      isLoading: false,
      error: null,
    });
  }

  setError(tabId: number, key: string | null, error: string): void {
    this.stateByTabId.set(tabId, {
      repositoryKey: key,
      report: null,
      isLoading: false,
      error,
    });
  }

  clear(tabId: number): void {
    this.stateByTabId.delete(tabId);
  }
}
