import type { HealthReport } from "../models/healthReport";
import type { RepositoryFacts } from "../models/repositoryFacts";
import { analyzeCiQualityInsights } from "./ciQualityInsights";
import { analyzeDependencyHealthInsights } from "./dependencyHealthInsights";
import { analyzeDocumentationQualityInsights } from "./documentationQualityInsights";
import { analyzeFrameworkInsights } from "./frameworkInsights";
import { analyzeLanguageInsights } from "./languageInsights";
import { analyzeReleaseInsights } from "./releaseInsights";
import { analyzeSecurityInsights } from "./securityInsights";
import type { RepositoryInsights } from "./types";

export function analyzeRepositoryInsights(
  facts: RepositoryFacts,
  report: HealthReport,
): RepositoryInsights {
  const analyzedAt = report.analyzedAt;

  return {
    owner: facts.owner,
    repo: facts.name,
    analyzedAt,
    sections: [
      section("language", "Language Best Practices", analyzeLanguageInsights(facts)),
      section("framework", "Framework Insights", analyzeFrameworkInsights(facts)),
      section(
        "dependency-health",
        "Dependency Health",
        analyzeDependencyHealthInsights(facts),
      ),
      section("release", "Release Quality", analyzeReleaseInsights(facts)),
      section("ci-quality", "CI/CD Quality", analyzeCiQualityInsights(facts)),
      section(
        "documentation-quality",
        "Documentation Completeness",
        analyzeDocumentationQualityInsights(facts, report),
      ),
      section("security", "Security Insights", analyzeSecurityInsights(facts)),
    ],
  };
}

function section(
  categoryId: import("./types").InsightCategoryId,
  categoryLabel: string,
  items: import("./types").InsightItem[],
) {
  return { categoryId, categoryLabel, items };
}
