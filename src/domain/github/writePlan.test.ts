import { describe, expect, it } from "vitest";

import { PrepareWritePlanUseCase } from "../../application/PrepareWritePlanUseCase";
import type { DraftDocument } from "../models/draftDocument";
import type { RepositoryFacts } from "../models/repositoryFacts";

describe("write plan preparation", () => {
  it("builds a complete plan without performing writes", () => {
    const facts: RepositoryFacts = {
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
    };

    const draft: DraftDocument = {
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

    const plan = new PrepareWritePlanUseCase().execute({
      facts,
      draft,
      existingBranchNames: ["repoready/docs/security"],
    });

    expect(plan.branchName).toBe("repoready/docs/security-2");
    expect(plan.fileActionLabel).toBe("Create new file");
    expect(plan.pullRequestBody).toContain("Generated using RepoReady");
  });
});
