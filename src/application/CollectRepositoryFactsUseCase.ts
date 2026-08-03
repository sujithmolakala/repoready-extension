import { AuthError, AuthErrorCode } from "../domain/errors";
import type { GitHubRepository } from "../domain/repository";
import type { RepositoryFacts } from "../domain/models/repositoryFacts";
import { FactCollector } from "../infrastructure/github/FactCollector";
import { PATAuthProvider } from "../infrastructure/auth/PATAuthProvider";

export class CollectRepositoryFactsUseCase {
  constructor(
    private readonly factCollector: FactCollector,
    private readonly authProvider: PATAuthProvider,
  ) {}

  async execute(repository: GitHubRepository): Promise<RepositoryFacts> {
    const isAuthenticated = await this.authProvider.isAuthenticated();

    if (!isAuthenticated) {
      throw new AuthError(
        AuthErrorCode.MISSING_TOKEN,
        "Connect GitHub in Settings to collect repository facts.",
      );
    }

    return this.factCollector.collect(repository.owner, repository.name);
  }
}
