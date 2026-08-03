import type {
  RepositoryFacts,
  RepositoryFactsState,
} from "../domain/models/repositoryFacts";
import {
  emptyRepositoryFactsState,
  repositoryKey,
} from "../domain/models/repositoryFacts";

export class RepositoryFactsStore {
  private readonly stateByTabId = new Map<number, RepositoryFactsState>();

  get(tabId: number): RepositoryFactsState {
    return this.stateByTabId.get(tabId) ?? emptyRepositoryFactsState;
  }

  setLoading(tabId: number, key: string): void {
    this.stateByTabId.set(tabId, {
      repositoryKey: key,
      facts: null,
      isLoading: true,
      error: null,
    });
  }

  setFacts(tabId: number, key: string, facts: RepositoryFacts): void {
    this.stateByTabId.set(tabId, {
      repositoryKey: key,
      facts,
      isLoading: false,
      error: null,
    });
  }

  setError(tabId: number, key: string | null, error: string): void {
    this.stateByTabId.set(tabId, {
      repositoryKey: key,
      facts: null,
      isLoading: false,
      error,
    });
  }

  clear(tabId: number): void {
    this.stateByTabId.delete(tabId);
  }
}

export { repositoryKey };
