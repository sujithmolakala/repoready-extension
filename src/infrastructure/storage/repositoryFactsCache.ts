import type { RepositoryFacts } from "../../domain/models/repositoryFacts";

export const FACTS_CACHE_TTL_MS = 15 * 60 * 1000;

export interface CachedRepositoryFacts {
  repositoryKey: string;
  facts: RepositoryFacts;
  cachedAt: string;
  repositoryPushedAt: string | null;
}

export function factsCacheStorageKey(owner: string, repo: string): string {
  return `facts-cache:${owner}/${repo}`;
}

export function isCacheFresh(
  cached: CachedRepositoryFacts,
  now = Date.now(),
): boolean {
  const cachedAt = Date.parse(cached.cachedAt);

  if (!Number.isFinite(cachedAt)) {
    return false;
  }

  return now - cachedAt <= FACTS_CACHE_TTL_MS;
}

export function isCacheStaleByRepositoryState(
  cached: CachedRepositoryFacts,
  pushedAt: string | null,
): boolean {
  return cached.repositoryPushedAt !== pushedAt;
}

export function shouldUseCachedFacts(input: {
  cached: CachedRepositoryFacts | null;
  pushedAt: string | null;
  forceRefresh: boolean;
  now?: number;
}): boolean {
  if (input.forceRefresh || input.cached === null) {
    return false;
  }

  if (!isCacheFresh(input.cached, input.now)) {
    return false;
  }

  if (isCacheStaleByRepositoryState(input.cached, input.pushedAt)) {
    return false;
  }

  return true;
}
