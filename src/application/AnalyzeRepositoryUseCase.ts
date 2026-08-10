import type { HealthReport } from "../domain/models/healthReport";
import type { RepositoryFacts } from "../domain/models/repositoryFacts";
import { analyzeRepositoryInsights } from "../domain/insights/analyzeInsights";
import type { RepositoryInsights } from "../domain/insights/types";
import { HealthScoreHistoryStore } from "../infrastructure/storage/HealthScoreHistoryStore";
import type { HealthScoreSnapshot } from "../domain/models/healthHistory";
import { calculateScoreTrend, type ScoreTrend } from "../domain/models/healthHistory";

export interface AnalysisResult {
  report: HealthReport;
  insights: RepositoryInsights;
  history: HealthScoreSnapshot[];
  trend: ScoreTrend;
}

export class AnalyzeRepositoryUseCase {
  constructor(
    private readonly evaluateHealthUseCase: import("./EvaluateHealthUseCase").EvaluateHealthUseCase,
    private readonly historyStore: HealthScoreHistoryStore,
  ) {}

  async execute(
    facts: RepositoryFacts,
    options?: { forceHistory?: boolean },
  ): Promise<AnalysisResult> {
    const report = this.evaluateHealthUseCase.execute(facts);
    const insights = analyzeRepositoryInsights(facts, report);
    const history = await this.historyStore.recordAnalysis(facts, report, {
      force: options?.forceHistory ?? false,
    });

    return {
      report,
      insights,
      history,
      trend: calculateScoreTrend(history),
    };
  }
}
