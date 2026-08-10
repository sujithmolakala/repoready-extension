import type { RecommendationDocumentType } from "./documentType";
import type { RepositoryFacts } from "./repositoryFacts";
import type { RepositoryInsights } from "../insights/types";
import type { ScoreTrend } from "./healthHistory";

export type CheckStatus = "passed" | "failed" | "undetermined";

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  pointsAwarded: number;
  pointsAvailable: number;
  explanation: string;
  detectionMethod: string;
}

export type RecommendationActionType = "generate-document" | "manual-fix";

export interface Recommendation {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  actionType: RecommendationActionType;
  relatedDocumentType?: RecommendationDocumentType;
  potentialPoints: number;
}

export interface PluginResult {
  categoryId: string;
  categoryLabel: string;
  pointsAwarded: number;
  maxPoints: number;
  checks: CheckResult[];
  recommendations: Recommendation[];
}

export interface HealthReport {
  owner: string;
  repo: string;
  totalScore: number;
  maxScore: number;
  categories: PluginResult[];
  recommendations: Recommendation[];
  analyzedAt: string;
}

export interface HealthReportState {
  repositoryKey: string | null;
  report: HealthReport | null;
  insights: RepositoryInsights | null;
  trend: ScoreTrend | null;
  isLoading: boolean;
  error: string | null;
}

export const emptyHealthReportState: HealthReportState = {
  repositoryKey: null,
  report: null,
  insights: null,
  trend: null,
  isLoading: false,
  error: null,
};

export interface HealthPlugin {
  readonly id: string;
  readonly categoryLabel: string;
  readonly maxPoints: number;

  analyze(facts: RepositoryFacts): PluginResult;
}
