import type { GitHubRepository } from "../domain/repository";

export class RepoStateStore {
  private readonly stateByTabId = new Map<number, GitHubRepository | null>();

  set(tabId: number, repository: GitHubRepository | null): void {
    this.stateByTabId.set(tabId, repository);
  }

  get(tabId: number): GitHubRepository | null {
    return this.stateByTabId.get(tabId) ?? null;
  }

  delete(tabId: number): void {
    this.stateByTabId.delete(tabId);
  }
}
