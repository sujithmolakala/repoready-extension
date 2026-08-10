import { AuthError, AuthErrorCode } from "../domain/errors";
import type { GitHubRepository } from "../domain/repository";
import type { RepositoryFacts } from "../domain/models/repositoryFacts";
import { FactCollector } from "../infrastructure/github/FactCollector";
import { PATAuthProvider } from "../infrastructure/auth/PATAuthProvider";
import { GitHubClient } from "../infrastructure/github/GitHubClient";
import { RepositoryFactsCacheStore } from "../infrastructure/storage/RepositoryFactsCacheStore";
import {
  isCacheFresh,
  isCacheStaleByRepositoryState,
} from "../infrastructure/storage/repositoryFactsCache";

export interface CollectRepositoryFactsOptions {
  forceRefresh?: boolean;
}

export class CollectRepositoryFactsUseCase {
  constructor(
    private readonly factCollector: FactCollector,
    private readonly authProvider: PATAuthProvider,
    private readonly githubClient: GitHubClient,
    private readonly cacheStore: RepositoryFactsCacheStore,
  ) {}

  async execute(
    repository: GitHubRepository,
    options: CollectRepositoryFactsOptions = {},
  ): Promise<RepositoryFacts> {
    const isAuthenticated = await this.authProvider.isAuthenticated();

    if (!isAuthenticated) {
      throw new AuthError(
        AuthErrorCode.MISSING_TOKEN,
        "Connect GitHub in Settings to collect repository facts.",
      );
    }

    const { owner, name } = repository;

    if (!options.forceRefresh) {
      const cached = await this.cacheStore.get(owner, name);

      if (cached !== null && isCacheFresh(cached)) {
        const repositoryMetadata = await this.githubClient.getRepository(owner, name);
        const pushedAt =
          typeof repositoryMetadata.pushed_at === "string"
            ? repositoryMetadata.pushed_at
            : null;

        if (!isCacheStaleByRepositoryState(cached, pushedAt)) {
          return cached.facts;
        }
      }
    }

    const facts = await this.factCollector.collect(owner, name);
    await this.cacheStore.set(facts);
    return facts;
  }
}
