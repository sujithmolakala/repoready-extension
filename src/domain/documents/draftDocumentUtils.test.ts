import { describe, expect, it } from "vitest";

import { GenerateDocumentUseCase } from "../../application/GenerateDocumentUseCase";
import type { RepositoryFacts } from "../models/repositoryFacts";
import {
  computeIsDirty,
  getDownloadFilename,
  getDraftStorageKey,
  normalizeStoredDraft,
  withResetDraftContent,
  withUpdatedDraftContent,
} from "./draftDocumentUtils";

function createFacts(): RepositoryFacts {
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
  };
}

describe("draftDocumentUtils", () => {
  it("marks drafts dirty when edited content differs from original", () => {
    const draft = new GenerateDocumentUseCase().execute({
      owner: "owner",
      repo: "repo",
      documentType: "CONTRIBUTING",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    const edited = withUpdatedDraftContent(
      draft,
      `${draft.content}\n\nEdited line`,
      "2026-01-02T00:00:00.000Z",
    );

    expect(edited.content).toContain("Edited line");
    expect(edited.isDirty).toBe(true);
    expect(edited.status).toBe("editing");
  });

  it("clears dirty state when content matches the original again", () => {
    const draft = new GenerateDocumentUseCase().execute({
      owner: "owner",
      repo: "repo",
      documentType: "SECURITY",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    const edited = withUpdatedDraftContent(
      draft,
      `${draft.content}\nEdit`,
      "2026-01-02T00:00:00.000Z",
    );
    const restored = withUpdatedDraftContent(
      edited,
      draft.originalContent,
      "2026-01-03T00:00:00.000Z",
    );

    expect(computeIsDirty(restored.content, restored.originalContent)).toBe(false);
    expect(restored.isDirty).toBe(false);
    expect(restored.status).toBe("draft");
  });

  it("resets only the selected draft content", () => {
    const draft = new GenerateDocumentUseCase().execute({
      owner: "owner",
      repo: "repo",
      documentType: "CHANGELOG",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    const edited = withUpdatedDraftContent(
      draft,
      "Temporary edit",
      "2026-01-02T00:00:00.000Z",
    );
    const reset = withResetDraftContent(edited, "2026-01-03T00:00:00.000Z");

    expect(reset.content).toBe(draft.originalContent);
    expect(reset.isDirty).toBe(false);
    expect(reset.documentType).toBe("CHANGELOG");
    expect(reset.warnings).toEqual(draft.warnings);
  });

  it("uses the basename for nested destination paths", () => {
    expect(getDownloadFilename(".github/ISSUE_TEMPLATE/bug_report.md")).toBe(
      "bug_report.md",
    );
    expect(getDownloadFilename("CONTRIBUTING.md")).toBe("CONTRIBUTING.md");
  });

  it("builds stable draft storage keys", () => {
    expect(getDraftStorageKey("RepoReady", "repoready", "SECURITY")).toBe(
      "draft:RepoReady/repoready/SECURITY",
    );
  });

  it("normalizes stored drafts without originalContent metadata", () => {
    const draft = new GenerateDocumentUseCase().execute({
      owner: "owner",
      repo: "repo",
      documentType: "SECURITY",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    const legacyDraft = {
      id: draft.id,
      owner: draft.owner,
      repo: draft.repo,
      documentType: draft.documentType,
      destinationPath: draft.destinationPath,
      content: draft.content,
      warnings: draft.warnings,
      status: draft.status,
      source: draft.source,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    };

    const normalized = normalizeStoredDraft(legacyDraft);

    expect(normalized?.originalContent).toBe(draft.content);
    expect(normalized?.isDirty).toBe(false);
  });
});

describe("GenerateDocumentUseCase draft metadata", () => {
  it("creates drafts with originalContent and isDirty=false", () => {
    const draft = new GenerateDocumentUseCase().execute({
      owner: "owner",
      repo: "repo",
      documentType: "PULL_REQUEST_TEMPLATE",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(draft.originalContent).toBe(draft.content);
    expect(draft.isDirty).toBe(false);
  });
});
