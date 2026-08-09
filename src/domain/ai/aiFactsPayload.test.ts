import { describe, expect, it } from "vitest";

import {
  buildAIFactsPayload,
  serializeAIFactsPayload,
  AI_FACTS_LIMITS,
} from "./aiFactsPayload";
import type { RepositoryFacts } from "../models/repositoryFacts";

function createFacts(
  overrides: Partial<RepositoryFacts> = {},
): RepositoryFacts {
  return {
    owner: "owner",
    name: "repo",
    defaultBranch: "main",
    description: "Example repository",
    homepage: null,
    visibility: "public",
    archived: false,
    fork: false,
    license: null,
    licenseFileExists: false,
    primaryLanguage: "TypeScript",
    languages: {},
    rootEntries: [],
    githubEntries: [],
    readme: { exists: false, path: null, content: null },
    dependencyFiles: [],
    workflowFiles: [],
    tree: { paths: [], truncated: false, skipped: false },
    activity: {
      pushedAt: null,
      updatedAt: null,
      openIssuesCount: 0,
      hasReleases: false,
    },
    fetchedAt: "2026-01-01T00:00:00.000Z",
    collectionWarnings: [],
    ...overrides,
  };
}

describe("buildAIFactsPayload", () => {
  it("caps README excerpt size", () => {
    const payload = buildAIFactsPayload(
      createFacts({
        readme: {
          exists: true,
          path: "README.md",
          content: "A".repeat(5_000),
        },
      }),
    );

    expect(payload.readmeExcerpt).not.toBeNull();
    if (payload.readmeExcerpt !== null) {
      expect(payload.readmeExcerpt.length).toBeLessThanOrEqual(
        AI_FACTS_LIMITS.readmeExcerptMaxChars + 20,
      );
    }
  });

  it("omits lockfile contents from manifest excerpts", () => {
    const payload = buildAIFactsPayload(
      createFacts({
        dependencyFiles: [
          {
            path: "package-lock.json",
            name: "package-lock.json",
            size: 1000,
            content: "{ \"name\": \"secret-lock\" }",
            contentStatus: "loaded",
          },
        ],
      }),
    );

    expect(payload.manifestExcerpts.join("\n")).toContain("lockfile omitted");
    expect(payload.manifestExcerpts.join("\n")).not.toContain("secret-lock");
  });

  it("marks payload as truncated when total size exceeds cap", () => {
    const payload = buildAIFactsPayload(
      createFacts({
        readme: {
          exists: true,
          path: "README.md",
          content: "R".repeat(6_000),
        },
        workflowFiles: Array.from({ length: 5 }, (_, index) => ({
          path: `.github/workflows/ci-${String(index)}.yml`,
          name: `ci-${String(index)}.yml`,
          size: 1000,
          content: "W".repeat(800),
          contentStatus: "loaded" as const,
        })),
        tree: {
          paths: Array.from({ length: 100 }, (_, index) => `src/file-${String(index)}.ts`),
          truncated: true,
          skipped: false,
        },
      }),
    );

    const serialized = serializeAIFactsPayload(payload);

    expect(payload.truncated).toBe(true);
    expect(serialized.length).toBeLessThanOrEqual(
      AI_FACTS_LIMITS.maxTotalPayloadChars + 200,
    );
  });
});
