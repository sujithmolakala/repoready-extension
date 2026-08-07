import { describe, expect, it } from "vitest";

import { GenerateDocumentUseCase } from "./GenerateDocumentUseCase";
import type { RepositoryFacts } from "../domain/models/repositoryFacts";

function createFacts(
  overrides: Partial<RepositoryFacts> = {},
): RepositoryFacts {
  return {
    owner: "owner",
    name: "repo",
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

describe("GenerateDocumentUseCase", () => {
  it("returns a draft document with static-template source", () => {
    const useCase = new GenerateDocumentUseCase();
    const draft = useCase.execute({
      owner: "owner",
      repo: "repo",
      documentType: "CHANGELOG",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(draft.status).toBe("draft");
    expect(draft.source).toBe("static-template");
    expect(draft.content).toContain("# Changelog");
    expect(draft.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });
});
