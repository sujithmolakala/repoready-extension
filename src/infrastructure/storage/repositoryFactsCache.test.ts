import { describe, expect, it } from "vitest";

import {
  FACTS_CACHE_TTL_MS,
  isCacheFresh,
  isCacheStaleByRepositoryState,
  shouldUseCachedFacts,
} from "./repositoryFactsCache";
import type { CachedRepositoryFacts } from "./repositoryFactsCache";

function createCached(pushedAt: string | null, cachedAt: string): CachedRepositoryFacts {
  return {
    repositoryKey: "acme/demo",
    cachedAt,
    repositoryPushedAt: pushedAt,
    facts: {
      owner: "acme",
      name: "demo",
      defaultBranch: "main",
      description: null,
      homepage: null,
      visibility: "public",
      archived: false,
      fork: false,
      license: null,
      licenseFileExists: false,
      primaryLanguage: null,
      languages: {},
      rootEntries: [],
      githubEntries: [],
      readme: { exists: false, path: null, content: null },
      dependencyFiles: [],
      workflowFiles: [],
      tree: { paths: [], truncated: false, skipped: false },
      activity: {
        pushedAt,
        updatedAt: null,
        openIssuesCount: 0,
        hasReleases: false,
      },
      fetchedAt: cachedAt,
      collectionWarnings: [],
    },
  };
}

describe("repository facts cache", () => {
  it("reuses fresh cache when pushedAt is unchanged", () => {
    const now = Date.parse("2026-01-02T00:00:00.000Z");
    const cached = createCached("2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z");

    expect(
      shouldUseCachedFacts({
        cached,
        pushedAt: "2026-01-01T00:00:00.000Z",
        forceRefresh: false,
        now,
      }),
    ).toBe(true);
  });

  it("invalidates cache when pushedAt changes", () => {
    const cached = createCached("2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z");

    expect(isCacheStaleByRepositoryState(cached, "2026-01-03T00:00:00.000Z")).toBe(
      true,
    );
  });

  it("bypasses cache on manual refresh", () => {
    const cached = createCached("2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z");

    expect(
      shouldUseCachedFacts({
        cached,
        pushedAt: "2026-01-01T00:00:00.000Z",
        forceRefresh: true,
      }),
    ).toBe(false);
  });

  it("expires cache after 15 minutes", () => {
    const cachedAt = "2026-01-01T00:00:00.000Z";
    const cached = createCached(null, cachedAt);

    expect(isCacheFresh(cached, Date.parse(cachedAt) + FACTS_CACHE_TTL_MS - 1)).toBe(
      true,
    );
    expect(isCacheFresh(cached, Date.parse(cachedAt) + FACTS_CACHE_TTL_MS + 1)).toBe(
      false,
    );
  });
});
