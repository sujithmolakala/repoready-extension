import type { RepositoryFacts } from "../models/repositoryFacts";
import type { HealthReport, HealthPlugin, PluginResult } from "../models/healthReport";

export function aggregateHealthReport(
  facts: RepositoryFacts,
  categories: PluginResult[],
): HealthReport {
  const recommendations = categories.flatMap((category) => category.recommendations);

  return {
    owner: facts.owner,
    repo: facts.name,
    totalScore: categories.reduce(
      (total, category) => total + category.pointsAwarded,
      0,
    ),
    maxScore: categories.reduce(
      (total, category) => total + category.maxPoints,
      0,
    ),
    categories,
    recommendations,
    analyzedAt: new Date().toISOString(),
  };
}

export function analyzeWithPlugins(
  facts: RepositoryFacts,
  plugins: HealthPlugin[],
): HealthReport {
  const categories = plugins.map((plugin) => plugin.analyze(facts));

  return aggregateHealthReport(facts, categories);
}
