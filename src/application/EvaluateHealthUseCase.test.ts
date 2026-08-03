import { describe, expect, it } from "vitest";

import { EvaluateHealthUseCase } from "./EvaluateHealthUseCase";
import type { RepositoryFacts } from "../domain/models/repositoryFacts";

function createFacts(): RepositoryFacts {
  return {
    owner: "RepoReady",
    name: "repoready",
    defaultBranch: "main",
    description: "Repository health extension",
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
      content: "# RepoReady\n\n".padEnd(220, "x"),
    },
    dependencyFiles: [],
    workflowFiles: [],
    tree: { paths: ["README.md", "LICENSE"], truncated: false, skipped: false },
    activity: {
      pushedAt: null,
      updatedAt: null,
      openIssuesCount: 0,
      hasReleases: false,
    },
    fetchedAt: "2026-01-01T00:00:00Z",
    collectionWarnings: [],
  };
}

describe("EvaluateHealthUseCase", () => {
  it("returns a health report from repository facts only", () => {
    const useCase = new EvaluateHealthUseCase();
    const report = useCase.execute(createFacts());

    expect(report.categories).toHaveLength(6);
    expect(report.maxScore).toBe(100);
  });
});
