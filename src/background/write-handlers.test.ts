import { describe, expect, it, vi } from "vitest";

import { createWriteHandlers } from "./write-handlers";
import type { DraftDocument } from "../domain/models/draftDocument";
import type { RepositoryFacts } from "../domain/models/repositoryFacts";

function createFacts(): RepositoryFacts {
  return {
    owner: "cursor",
    name: "repoready",
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
  };
}

function createDraft(): DraftDocument {
  return {
    id: "cursor/repoready/SECURITY",
    owner: "cursor",
    repo: "repoready",
    documentType: "SECURITY",
    destinationPath: "SECURITY.md",
    content: "# Security\n",
    originalContent: "# Security\n",
    isDirty: false,
    warnings: [],
    status: "draft",
    source: "static-template",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("createWriteHandlers", () => {
  it("does not write when preparing a plan", async () => {
    const createPullRequest = vi.fn();
    const handlers = createWriteHandlers(
      {
        execute: vi.fn(async () => ({
          destinationPath: "SECURITY.md",
          fileAction: "create" as const,
          fileActionLabel: "Create new file",
          branchName: "repoready/docs/security",
          commitMessage: "docs: add SECURITY.md",
          pullRequestTitle: "docs: add SECURITY.md",
          pullRequestBody: "Generated using RepoReady",
          defaultBranch: "main",
          fileExists: false,
        })),
      },
      { execute: createPullRequest },
    );

    const response = await handlers.handlePrepareWritePlan({
      facts: createFacts(),
      draft: createDraft(),
    });

    expect(response.success).toBe(true);
    expect(createPullRequest).not.toHaveBeenCalled();
  });
});
