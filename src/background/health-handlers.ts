import { AnalyzeRepositoryUseCase } from "../application/AnalyzeRepositoryUseCase";
import { HealthReportStore } from "../application/health-report-store";
import { repositoryKey } from "../application/repository-facts-store";
import type { RepositoryFacts } from "../domain/models/repositoryFacts";
import { emptyHealthReportState } from "../domain/models/healthReport";
import {
  MessageType,
  type GetHealthReportResponse,
  type HealthReportUpdatedMessage,
} from "../shared/messages";

export function createHealthReportHandlers(
  analyzeRepositoryUseCase: AnalyzeRepositoryUseCase,
  healthReportStore: HealthReportStore,
  broadcastHealthReport: (
    healthState: GetHealthReportResponse["healthState"],
  ) => void,
) {
  function handleGetHealthReport(
    tabId: number | undefined,
  ): GetHealthReportResponse {
    if (tabId === undefined) {
      return { healthState: emptyHealthReportState };
    }

    return { healthState: healthReportStore.get(tabId) };
  }

  async function evaluateForTab(
    tabId: number,
    facts: RepositoryFacts,
    options?: { forceHistory?: boolean },
  ): Promise<void> {
    const key = repositoryKey(facts.owner, facts.name);
    healthReportStore.setLoading(tabId, key);
    broadcastHealthReport(healthReportStore.get(tabId));

    try {
      const analysis = await analyzeRepositoryUseCase.execute(facts, options);
      healthReportStore.setAnalysis(
        tabId,
        key,
        analysis.report,
        analysis.insights,
        analysis.trend,
      );
      broadcastHealthReport(healthReportStore.get(tabId));
    } catch {
      healthReportStore.setError(
        tabId,
        key,
        "Could not evaluate repository health.",
      );
      broadcastHealthReport(healthReportStore.get(tabId));
    }
  }

  function clearForTab(tabId: number): void {
    healthReportStore.clear(tabId);
    broadcastHealthReport(emptyHealthReportState);
  }

  return {
    handleGetHealthReport,
    evaluateForTab,
    clearForTab,
  };
}

export function createHealthReportBroadcaster() {
  return (healthState: GetHealthReportResponse["healthState"]): void => {
    const message: HealthReportUpdatedMessage = {
      type: MessageType.HEALTH_REPORT_UPDATED,
      payload: { healthState },
    };

    void chrome.runtime.sendMessage(message).catch(() => {
      // Side panel may not be open.
    });
  };
}
