import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { GenerateDocumentUseCase } from "../../application/GenerateDocumentUseCase";
import type { RepositoryFacts } from "../../domain/models/repositoryFacts";
import { DraftPreviewView } from "../components/DraftPreviewView";
import { DocumentOpportunityCard } from "../components/DocumentsView";
import {
  createInitialDocumentDraftState,
  getSelectedDraft,
  selectDraft,
  shouldShowPreviewDraftButton,
  storeGeneratedDraft,
  updateDraftContent,
} from "./documentDraftState";

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

describe("documentDraftState", () => {
  it("stores a generated draft and selects it", () => {
    const useCase = new GenerateDocumentUseCase();
    const draft = useCase.execute({
      owner: "owner",
      repo: "repo",
      documentType: "CONTRIBUTING",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    const nextState = storeGeneratedDraft(createInitialDocumentDraftState(), draft);

    expect(nextState.selectedDocumentType).toBe("CONTRIBUTING");
    expect(getSelectedDraft(nextState)?.content).toContain("# Contributing to repo");
  });

  it("hides preview until a draft exists", () => {
    expect(
      shouldShowPreviewDraftButton(createInitialDocumentDraftState().drafts, "SECURITY"),
    ).toBe(false);
  });

  it("shows preview after generation", () => {
    const useCase = new GenerateDocumentUseCase();
    const draft = useCase.execute({
      owner: "owner",
      repo: "repo",
      documentType: "SECURITY",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    const state = storeGeneratedDraft(createInitialDocumentDraftState(), draft);

    expect(shouldShowPreviewDraftButton(state.drafts, "SECURITY")).toBe(true);
  });

  it("opens an existing draft without regenerating it", () => {
    const useCase = new GenerateDocumentUseCase();
    const executeSpy = vi.spyOn(useCase, "execute");
    const draft = useCase.execute({
      owner: "owner",
      repo: "repo",
      documentType: "CHANGELOG",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    let state = storeGeneratedDraft(createInitialDocumentDraftState(), draft);
    state = {
      ...state,
      selectedDocumentType: null,
    };

    expect(getSelectedDraft(state)).toBeNull();

    state = selectDraft(state, "CHANGELOG");

    expect(getSelectedDraft(state)?.documentType).toBe("CHANGELOG");
    expect(executeSpy).toHaveBeenCalledTimes(1);
  });

  it("switches between two generated drafts", () => {
    const useCase = new GenerateDocumentUseCase();
    const contributingDraft = useCase.execute({
      owner: "owner",
      repo: "repo",
      documentType: "CONTRIBUTING",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    const securityDraft = useCase.execute({
      owner: "owner",
      repo: "repo",
      documentType: "SECURITY",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    let state = storeGeneratedDraft(createInitialDocumentDraftState(), contributingDraft);
    state = storeGeneratedDraft(state, securityDraft);
    state = selectDraft(state, "CONTRIBUTING");

    expect(getSelectedDraft(state)?.documentType).toBe("CONTRIBUTING");
    expect(getSelectedDraft(state)?.content).toContain("# Contributing to repo");

    state = selectDraft(state, "SECURITY");

    expect(getSelectedDraft(state)?.documentType).toBe("SECURITY");
    expect(getSelectedDraft(state)?.content).toContain("# Security Policy");
  });

  it("does not select drafts that were never generated", () => {
    const state = selectDraft(createInitialDocumentDraftState(), "CONTRIBUTING");

    expect(getSelectedDraft(state)).toBeNull();
  });
});

describe("GenerateDocumentUseCase preview integration", () => {
  it("does not perform GitHub or AI calls while creating preview drafts", () => {
    const draft = new GenerateDocumentUseCase().execute({
      owner: "owner",
      repo: "repo",
      documentType: "CODE_OF_CONDUCT",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(draft.source).toBe("static-template");
    expect(draft.status).toBe("draft");
    expect(draft.content.length).toBeGreaterThan(0);
  });
});

describe("Draft preview UI", () => {
  const previewProps = {
    viewMode: "preview" as const,
    onViewModeChange: () => undefined,
    onContentChange: () => undefined,
    onReset: () => undefined,
  };

  it("renders generated Markdown content in the preview area", () => {
    const draft = new GenerateDocumentUseCase().execute({
      owner: "owner",
      repo: "repo",
      documentType: "CONTRIBUTING",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    const markup = renderToStaticMarkup(
      createElement(DraftPreviewView, { draft, ...previewProps }),
    );

    expect(markup).toContain('data-testid="draft-preview"');
    expect(markup).toContain("Contributing to repo");
    expect(markup).toContain('data-testid="draft-markdown-preview"');
  });

  it("renders edited content in preview mode", () => {
    let state = storeGeneratedDraft(
      createInitialDocumentDraftState(),
      new GenerateDocumentUseCase().execute({
        owner: "owner",
        repo: "repo",
        documentType: "SECURITY",
        facts: createFacts(),
        generatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    state = updateDraftContent(
      state,
      "SECURITY",
      "# Security Policy\n\nEdited section",
      "2026-01-02T00:00:00.000Z",
    );
    const draft = getSelectedDraft(state);
    expect(draft).toBeDefined();
    if (draft === null) {
      return;
    }

    const markup = renderToStaticMarkup(
      createElement(DraftPreviewView, { draft, ...previewProps }),
    );

    expect(markup).toContain("Edited section");
  });

  it("does not execute raw HTML from generated Markdown in preview", () => {
    const generated = new GenerateDocumentUseCase().execute({
      owner: "owner",
      repo: "repo",
      documentType: "SECURITY",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    let state = storeGeneratedDraft(createInitialDocumentDraftState(), generated);
    state = updateDraftContent(
      state,
      "SECURITY",
      '# Security\n\n<script>alert("x")</script>',
      "2026-01-02T00:00:00.000Z",
    );
    const draft = getSelectedDraft(state);
    expect(draft).toBeDefined();
    if (draft === null) {
      return;
    }

    const markup = renderToStaticMarkup(
      createElement(DraftPreviewView, { draft, ...previewProps }),
    );

    expect(markup).not.toMatch(/<script[\s>]/i);
    expect(markup).toContain("&lt;script&gt;");
  });

  it("hides Preview draft before a draft exists", () => {
    const markup = renderToStaticMarkup(
      createElement(DocumentOpportunityCard, {
        draft: null,
        isSelected: false,
        onGenerateDraft: () => undefined,
        onPreviewDraft: () => undefined,
        opportunity: {
          documentType: "SECURITY",
          displayName: "Security Policy",
          destinationPath: "SECURITY.md",
          reason: "Missing security policy",
          potentialPoints: 5,
          recommendationId: "security-add-security-policy",
          categoryId: "security",
        },
        showPreviewButton: false,
      }),
    );

    expect(markup).not.toContain("Preview draft");
  });

  it("shows Preview draft after generation", () => {
    const draft = new GenerateDocumentUseCase().execute({
      owner: "owner",
      repo: "repo",
      documentType: "SECURITY",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    const markup = renderToStaticMarkup(
      createElement(DocumentOpportunityCard, {
        draft,
        isSelected: true,
        onGenerateDraft: () => undefined,
        onPreviewDraft: () => undefined,
        opportunity: {
          documentType: "SECURITY",
          displayName: "Security Policy",
          destinationPath: "SECURITY.md",
          reason: "Missing security policy",
          potentialPoints: 5,
          recommendationId: "security-add-security-policy",
          categoryId: "security",
        },
        showPreviewButton: true,
      }),
    );

    expect(markup).toContain("Preview draft");
  });
});
