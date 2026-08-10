import type { RepositoryFacts } from "../../domain/models/repositoryFacts";
import {
  factsCacheStorageKey,
  type CachedRepositoryFacts,
} from "./repositoryFactsCache";

export class RepositoryFactsCacheStore {
  async get(owner: string, repo: string): Promise<CachedRepositoryFacts | null> {
    const key = factsCacheStorageKey(owner, repo);
    const result = await chrome.storage.local.get(key);
    const value = result[key];

    if (!isCachedRepositoryFacts(value)) {
      return null;
    }

    return value;
  }

  async set(facts: RepositoryFacts): Promise<void> {
    const key = factsCacheStorageKey(facts.owner, facts.name);
    const entry: CachedRepositoryFacts = {
      repositoryKey: `${facts.owner}/${facts.name}`,
      facts,
      cachedAt: new Date().toISOString(),
      repositoryPushedAt: facts.activity.pushedAt,
    };

    await chrome.storage.local.set({ [key]: entry });
  }

  async remove(owner: string, repo: string): Promise<void> {
    const key = factsCacheStorageKey(owner, repo);
    await chrome.storage.local.remove(key);
  }

  async listRecentRepositoryKeys(): Promise<string[]> {
    const all = await chrome.storage.local.get(null);
    const keys: string[] = [];

    for (const [storageKey, value] of Object.entries(all)) {
      if (
        storageKey.startsWith("facts-cache:") &&
        isCachedRepositoryFacts(value)
      ) {
        keys.push(value.repositoryKey);
      }
    }

    return keys;
  }
}

function isCachedRepositoryFacts(value: unknown): value is CachedRepositoryFacts {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const cached = value as Record<string, unknown>;

  return (
    typeof cached.repositoryKey === "string" &&
    typeof cached.cachedAt === "string" &&
    typeof cached.facts === "object" &&
    cached.facts !== null
  );
}
