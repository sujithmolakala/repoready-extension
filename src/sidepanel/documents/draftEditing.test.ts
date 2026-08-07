import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { GenerateDocumentUseCase } from "../../application/GenerateDocumentUseCase";
import type { RepositoryFacts } from "../../domain/models/repositoryFacts";
import { copyMarkdownToClipboard, downloadMarkdownFile } from "./draftActions";
import {
  createInitialDocumentDraftState,
  getSelectedDraft,
  resetDraftContent,
  selectDraft,
  storeGeneratedDraft,
  updateDraftContent,
} from "./documentDraftState";

function createFacts(): RepositoryFacts {
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
  };
}

describe("draftActions", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("copies edited content to the clipboard", async () => {
    const draft = new GenerateDocumentUseCase().execute({
      owner: "owner",
      repo: "repo",
      documentType: "CONTRIBUTING",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    const editedState = updateDraftContent(
      storeGeneratedDraft(createInitialDocumentDraftState(), draft),
      "CONTRIBUTING",
      "Edited markdown",
      "2026-01-02T00:00:00.000Z",
    );
    const editedDraft = editedState.drafts.CONTRIBUTING;

    expect(editedDraft).toBeDefined();
    await copyMarkdownToClipboard(editedDraft?.content ?? "");

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Edited markdown");
    expect(navigator.clipboard.writeText).not.toHaveBeenCalledWith(draft.originalContent);
  });

  it("downloads edited content with the correct filename", () => {
    const click = vi.fn();
    const revokeObjectURL = vi.fn();
    const createObjectURL = vi.fn().mockReturnValue("blob:draft");
    const draft = new GenerateDocumentUseCase().execute({
      owner: "owner",
      repo: "repo",
      documentType: "ISSUE_TEMPLATE_BUG",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    const editedContent = `${draft.content}\nEdited`;
    const anchor = {
      href: "",
      download: "",
      rel: "",
      click,
    } as HTMLAnchorElement;

    vi.stubGlobal("document", {
      createElement: vi.fn().mockReturnValue(anchor),
    });
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });

    downloadMarkdownFile(editedContent, "bug_report.md");

    expect(createObjectURL).toHaveBeenCalled();
    expect(anchor.download).toBe("bug_report.md");
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:draft");
  });
});

describe("documentDraftState editing", () => {
  it("preserves independent edits when switching drafts", () => {
    const useCase = new GenerateDocumentUseCase();
    const contributing = useCase.execute({
      owner: "owner",
      repo: "repo",
      documentType: "CONTRIBUTING",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    const security = useCase.execute({
      owner: "owner",
      repo: "repo",
      documentType: "SECURITY",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    let state = storeGeneratedDraft(createInitialDocumentDraftState(), contributing);
    state = storeGeneratedDraft(state, security);
    state = updateDraftContent(
      state,
      "CONTRIBUTING",
      "Edited contributing draft",
      "2026-01-02T00:00:00.000Z",
    );
    state = selectDraft(state, "SECURITY");
    state = updateDraftContent(
      state,
      "SECURITY",
      "Edited security draft",
      "2026-01-03T00:00:00.000Z",
    );
    state = selectDraft(state, "CONTRIBUTING");

    expect(getSelectedDraft(state)?.content).toBe("Edited contributing draft");
    expect(state.drafts.SECURITY?.content).toBe("Edited security draft");
  });

  it("resets only the selected draft", () => {
    const useCase = new GenerateDocumentUseCase();
    const contributing = useCase.execute({
      owner: "owner",
      repo: "repo",
      documentType: "CONTRIBUTING",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    const security = useCase.execute({
      owner: "owner",
      repo: "repo",
      documentType: "SECURITY",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    let state = storeGeneratedDraft(createInitialDocumentDraftState(), contributing);
    state = storeGeneratedDraft(state, security);
    state = updateDraftContent(
      state,
      "CONTRIBUTING",
      "Edited contributing draft",
      "2026-01-02T00:00:00.000Z",
    );
    state = updateDraftContent(
      state,
      "SECURITY",
      "Edited security draft",
      "2026-01-03T00:00:00.000Z",
    );
    state = resetDraftContent(state, "CONTRIBUTING", "2026-01-04T00:00:00.000Z");

    expect(state.drafts.CONTRIBUTING?.content).toBe(contributing.originalContent);
    expect(state.drafts.CONTRIBUTING?.isDirty).toBe(false);
    expect(state.drafts.SECURITY?.content).toBe("Edited security draft");
    expect(state.drafts.SECURITY?.isDirty).toBe(true);
  });
});

describe("DraftStore persistence", () => {
  it("restores drafts after panel reopen", async () => {
    const draft = new GenerateDocumentUseCase().execute({
      owner: "owner",
      repo: "repo",
      documentType: "SECURITY",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    const editedDraft = {
      ...draft,
      content: "Edited security draft",
      isDirty: true,
      status: "editing" as const,
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    const storage = new Map<string, unknown>([
      ["draft:owner/repo/SECURITY", editedDraft],
    ]);

    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn(async (keys: string | null) => {
            if (keys === null) {
              return Object.fromEntries(storage.entries());
            }

            if (typeof keys === "string") {
              return { [keys]: storage.get(keys) };
            }

            return {};
          }),
          set: vi.fn(async (value: Record<string, unknown>) => {
            for (const [key, entry] of Object.entries(value)) {
              storage.set(key, entry);
            }
          }),
        },
      },
    });

    const { DraftStore } = await import("../../infrastructure/storage/DraftStore");
    const store = new DraftStore();
    const restored = await store.loadDraftsForRepository("owner", "repo");

    expect(restored.SECURITY?.content).toBe("Edited security draft");
    expect(restored.SECURITY?.isDirty).toBe(true);

    vi.unstubAllGlobals();
  });
});
