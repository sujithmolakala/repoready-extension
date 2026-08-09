import { describe, expect, it } from "vitest";

import {
  withResetDraftContent,
  withUpdatedDraftContent,
} from "../../domain/documents/draftDocumentUtils";
import type { DraftDocument } from "../../domain/models/draftDocument";
import {
  replaceGeneratedDraft,
  resetDraftContent,
  storeGeneratedDraft,
} from "./documentDraftState";

function createAIDraft(content: string): DraftDocument {
  return {
    id: "owner/repo/CONTRIBUTING",
    owner: "owner",
    repo: "repo",
    documentType: "CONTRIBUTING",
    destinationPath: "CONTRIBUTING.md",
    content,
    originalContent: content,
    isDirty: false,
    warnings: [],
    status: "draft",
    source: "ai-generated",
    aiMetadata: { provider: "openai", model: "gpt-4.1-mini" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("AI draft state", () => {
  it("reset returns to original AI generation without regenerating", () => {
    const original = createAIDraft("# Original AI draft");
    let state = storeGeneratedDraft(
      { drafts: {}, selectedDocumentType: null },
      original,
    );

    state = {
      ...state,
      drafts: {
        CONTRIBUTING: withUpdatedDraftContent(
          original,
          "# Edited content",
          "2026-01-02T00:00:00.000Z",
        ),
      },
    };

    state = resetDraftContent(state, "CONTRIBUTING", "2026-01-03T00:00:00.000Z");

    const draft = state.drafts.CONTRIBUTING;

    expect(draft?.content).toBe("# Original AI draft");
    expect(draft?.isDirty).toBe(false);
  });

  it("replaceGeneratedDraft preserves createdAt for regenerate", () => {
    const original = createAIDraft("# Original");
    let state = storeGeneratedDraft(
      { drafts: {}, selectedDocumentType: null },
      original,
    );

    const regenerated = createAIDraft("# Regenerated");
    regenerated.updatedAt = "2026-01-02T00:00:00.000Z";
    regenerated.createdAt = "2026-01-02T00:00:00.000Z";

    state = replaceGeneratedDraft(state, regenerated);

    expect(state.drafts.CONTRIBUTING?.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(state.drafts.CONTRIBUTING?.content).toBe("# Regenerated");
    expect(state.drafts.CONTRIBUTING?.isDirty).toBe(false);
  });

  it("supports edit workflow for AI drafts", () => {
    const draft = createAIDraft("# AI");
    const edited = withUpdatedDraftContent(
      draft,
      "# AI edited",
      "2026-01-02T00:00:00.000Z",
    );

    expect(edited.isDirty).toBe(true);
    expect(edited.content).toBe("# AI edited");
    expect(
      withResetDraftContent(edited, "2026-01-03T00:00:00.000Z").content,
    ).toBe("# AI");
  });
});
