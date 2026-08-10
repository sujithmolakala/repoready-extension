import type { CheckStatus } from "../models/healthReport";

export type InsightCategoryId =
  | "language"
  | "framework"
  | "dependency-health"
  | "release"
  | "ci-quality"
  | "documentation-quality"
  | "security";

export interface InsightItem {
  id: string;
  categoryId: InsightCategoryId;
  label: string;
  status: CheckStatus;
  explanation: string;
}

export interface InsightSection {
  categoryId: InsightCategoryId;
  categoryLabel: string;
  items: InsightItem[];
}

export interface RepositoryInsights {
  owner: string;
  repo: string;
  analyzedAt: string;
  sections: InsightSection[];
}
