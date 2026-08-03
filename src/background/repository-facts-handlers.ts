import { CollectRepositoryFactsUseCase } from "../application/CollectRepositoryFactsUseCase";
import {
  RepositoryFactsStore,
  repositoryKey,
} from "../application/repository-facts-store";
import { AuthError } from "../domain/errors";
import type { GitHubRepository } from "../domain/repository";
import { emptyRepositoryFactsState } from "../domain/models/repositoryFacts";
import { estimateSerializedFactsBytes } from "../shared/format-facts-debug";
import {
  MessageType,
  type GetRepositoryFactsResponse,
  type RepositoryFactsUpdatedMessage,
} from "../shared/messages";

export function createRepositoryFactsHandlers(
  collectRepositoryFactsUseCase: CollectRepositoryFactsUseCase,
  repositoryFactsStore: RepositoryFactsStore,
  broadcastFactsState: (factsState: GetRepositoryFactsResponse["factsState"]) => void,
) {
  function handleGetRepositoryFacts(
    tabId: number | undefined,
  ): GetRepositoryFactsResponse {
    if (tabId === undefined) {
      return { factsState: emptyRepositoryFactsState };
    }

    return { factsState: repositoryFactsStore.get(tabId) };
  }

  async function collectForTab(
    tabId: number,
    repository: GitHubRepository | null,
  ): Promise<void> {
    if (repository === null) {
      repositoryFactsStore.clear(tabId);
      broadcastFactsState(emptyRepositoryFactsState);
      return;
    }

    const key = repositoryKey(repository.owner, repository.name);
    repositoryFactsStore.setLoading(tabId, key);
    broadcastFactsState(repositoryFactsStore.get(tabId));

    try {
      const facts = await collectRepositoryFactsUseCase.execute(repository);
      repositoryFactsStore.setFacts(tabId, key, facts);

      if (import.meta.env.DEV) {
        console.info("[RepoReady Facts Diagnostic]", {
          repositoryKey: key,
          approximateCacheSizeBytes: estimateSerializedFactsBytes(facts),
        });
      }

      broadcastFactsState(repositoryFactsStore.get(tabId));
    } catch (error) {
      const message =
        error instanceof AuthError
          ? error.message
          : "Could not collect repository facts.";

      repositoryFactsStore.setError(tabId, key, message);
      broadcastFactsState(repositoryFactsStore.get(tabId));
    }
  }

  return {
    handleGetRepositoryFacts,
    collectForTab,
  };
}

export function createRepositoryFactsBroadcaster() {
  return (factsState: GetRepositoryFactsResponse["factsState"]): void => {
    const message: RepositoryFactsUpdatedMessage = {
      type: MessageType.REPOSITORY_FACTS_UPDATED,
      payload: { factsState },
    };

    void chrome.runtime.sendMessage(message).catch(() => {
      // Side panel may not be open.
    });
  };
}
