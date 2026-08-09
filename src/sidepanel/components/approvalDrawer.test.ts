import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { PrepareWritePlanUseCase } from "../../application/PrepareWritePlanUseCase";

describe("approval drawer source", () => {
  it("requires explicit create pull request action in UI", () => {
    const documentsView = String(
      readFileSync("src/sidepanel/components/DocumentsView.tsx", "utf8"),
    );
    const approvalDrawer = String(
      readFileSync("src/sidepanel/components/ApprovalDrawer.tsx", "utf8"),
    );

    expect(documentsView).toContain("handleConfirmCreatePullRequest");
    expect(approvalDrawer).toContain("Nothing has been written yet");
    expect(approvalDrawer).toContain("Create Pull Request");
  });

  it("does not auto-create pull requests during plan preparation", () => {
    const useCase = new PrepareWritePlanUseCase();
    const plan = useCase.execute({
      facts: {
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
        readme: { exists: true, path: "README.md", content: "# Repo" },
        dependencyFiles: [],
        workflowFiles: [],
        tree: { paths: ["README.md"], truncated: false, skipped: false },
        activity: {
          pushedAt: null,
          updatedAt: null,
          openIssuesCount: 0,
          hasReleases: false,
        },
        fetchedAt: "2026-01-01T00:00:00.000Z",
        collectionWarnings: [],
      },
      draft: {
        id: "cursor/repoready/CONTRIBUTING",
        owner: "cursor",
        repo: "repoready",
        documentType: "CONTRIBUTING",
        destinationPath: "README.md",
        content: "# Improved",
        originalContent: "# Improved",
        isDirty: false,
        warnings: [],
        status: "draft",
        source: "ai-generated",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      existingBranchNames: [],
    });

    expect(plan.fileActionLabel).toBe("Improve existing README");
  });
});
