import { describe, expect, it } from "vitest";

import type { RepositoryFacts } from "../domain/models/repositoryFacts";
import { DEBUG_CONTENT_PREVIEW_CHARS } from "../domain/models/repositoryFileContent";
import {
  containsTokenLikeValue,
  formatRepositoryFactsForDebug,
  summarizeRepositoryFileForDebug,
} from "./format-facts-debug";

function createSampleFacts(
  overrides: Partial<RepositoryFacts> = {},
): RepositoryFacts {
  const largeContent = "x".repeat(DEBUG_CONTENT_PREVIEW_CHARS + 100);

  return {
    owner: "RepoReady",
    name: "repoready",
    defaultBranch: "main",
    description: "Sample repository",
    homepage: null,
    visibility: "public",
    archived: false,
    fork: false,
    license: null,
    licenseFileExists: true,
    primaryLanguage: "TypeScript",
    languages: { TypeScript: 1000 },
    rootEntries: [],
    githubEntries: [],
    readme: {
      exists: true,
      path: "README.md",
      content: largeContent,
    },
    dependencyFiles: [
      {
        path: "package.json",
        name: "package.json",
        size: 100,
        content: '{"name":"repoready"}',
        contentStatus: "loaded",
      },
      {
        path: "package-lock.json",
        name: "package-lock.json",
        size: 170251,
        content: null,
        contentStatus: "skipped-lockfile",
      },
    ],
    workflowFiles: [],
    tree: {
      paths: ["README.md", "package.json"],
      truncated: false,
      skipped: false,
    },
    activity: {
      pushedAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      openIssuesCount: 0,
      hasReleases: false,
    },
    fetchedAt: "2026-01-03T00:00:00Z",
    collectionWarnings: [],
    ...overrides,
  };
}

describe("formatRepositoryFactsForDebug", () => {
  it("does not render complete dependency file contents", () => {
    const debugFacts = formatRepositoryFactsForDebug(createSampleFacts());

    expect(debugFacts.dependencyFiles).toEqual([
      {
        path: "package.json",
        name: "package.json",
        size: 100,
        contentStatus: "loaded",
        preview: '{"name":"repoready"}',
      },
      {
        path: "package-lock.json",
        name: "package-lock.json",
        size: 170251,
        contentStatus: "skipped-lockfile",
      },
    ]);
    expect(JSON.stringify(debugFacts)).not.toContain('"x".repeat');
    expect(
      debugFacts.dependencyFiles.find((file) => file.name === "package-lock.json"),
    ).toEqual({
      path: "package-lock.json",
      name: "package-lock.json",
      size: 170251,
      contentStatus: "skipped-lockfile",
    });
  });

  it("caps debug previews at 500 characters", () => {
    const debugFacts = formatRepositoryFactsForDebug(createSampleFacts());

    expect(debugFacts.readme.preview).toHaveLength(DEBUG_CONTENT_PREVIEW_CHARS + 1);
    expect(debugFacts.readme.preview?.endsWith("…")).toBe(true);
  });

  it("includes approximate cache size bytes without logging raw content", () => {
    const facts = createSampleFacts();
    const debugFacts = formatRepositoryFactsForDebug(facts);

    expect(debugFacts.approximateCacheSizeBytes).toBeGreaterThan(0);
    expect(debugFacts.approximateCacheSizeBytes).toBe(
      new TextEncoder().encode(JSON.stringify(facts)).byteLength,
    );
  });
});

describe("summarizeRepositoryFileForDebug", () => {
  it("omits preview when content was skipped", () => {
    expect(
      summarizeRepositoryFileForDebug({
        path: "package-lock.json",
        name: "package-lock.json",
        size: 10,
        content: null,
        contentStatus: "skipped-lockfile",
      }),
    ).toEqual({
      path: "package-lock.json",
      name: "package-lock.json",
      size: 10,
      contentStatus: "skipped-lockfile",
    });
  });
});

describe("containsTokenLikeValue", () => {
  it("detects github token patterns in cached data", () => {
    expect(
      containsTokenLikeValue({
        owner: "RepoReady",
        token: "github_pat_1234567890",
      }),
    ).toBe(true);
  });

  it("returns false for normal repository facts", () => {
    expect(containsTokenLikeValue(createSampleFacts())).toBe(false);
  });
});
