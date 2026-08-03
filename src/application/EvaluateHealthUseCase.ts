import { analyzeWithPlugins } from "../domain/health/analyzeHealthReport";
import { defaultHealthPlugins } from "../domain/health/defaultHealthPlugins";
import type { HealthPlugin } from "../domain/models/healthReport";
import type { RepositoryFacts } from "../domain/models/repositoryFacts";
import type { HealthReport } from "../domain/models/healthReport";

export class EvaluateHealthUseCase {
  constructor(
    private readonly plugins: readonly HealthPlugin[] = defaultHealthPlugins,
  ) {}

  execute(facts: RepositoryFacts): HealthReport {
    return analyzeWithPlugins(facts, [...this.plugins]);
  }
}
