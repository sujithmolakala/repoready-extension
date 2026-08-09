import type { DraftDocument } from "../../domain/models/draftDocument";
import type { DocumentType } from "../../domain/models/documentType";
import {
  withResetDraftContent,
  withUpdatedDraftContent,
} from "../../domain/documents/draftDocumentUtils";

export interface DocumentDraftState {
  drafts: Partial<Record<DocumentType, DraftDocument>>;
  selectedDocumentType: DocumentType | null;
}

export function createInitialDocumentDraftState(): DocumentDraftState {
  return {
    drafts: {},
    selectedDocumentType: null,
  };
}

export function getSelectedDraft(
  state: DocumentDraftState,
): DraftDocument | null {
  if (state.selectedDocumentType === null) {
    return null;
  }

  return state.drafts[state.selectedDocumentType] ?? null;
}

export function shouldShowPreviewDraftButton(
  drafts: Partial<Record<DocumentType, DraftDocument>>,
  documentType: DocumentType,
): boolean {
  return drafts[documentType] !== undefined;
}

export function storeGeneratedDraft(
  state: DocumentDraftState,
  draft: DraftDocument,
): DocumentDraftState {
  return {
    drafts: {
      ...state.drafts,
      [draft.documentType]: draft,
    },
    selectedDocumentType: draft.documentType,
  };
}

export function replaceGeneratedDraft(
  state: DocumentDraftState,
  draft: DraftDocument,
): DocumentDraftState {
  const existingDraft = state.drafts[draft.documentType];

  const nextDraft: DraftDocument =
    existingDraft !== undefined
      ? {
          ...draft,
          id: existingDraft.id,
          createdAt: existingDraft.createdAt,
        }
      : draft;

  return storeGeneratedDraft(state, nextDraft);
}

export function selectDraft(
  state: DocumentDraftState,
  documentType: DocumentType,
): DocumentDraftState {
  if (state.drafts[documentType] === undefined) {
    return state;
  }

  return {
    ...state,
    selectedDocumentType: documentType,
  };
}

export function updateDraftContent(
  state: DocumentDraftState,
  documentType: DocumentType,
  content: string,
  updatedAt: string,
): DocumentDraftState {
  const existingDraft = state.drafts[documentType];

  if (existingDraft === undefined) {
    return state;
  }

  return {
    ...state,
    drafts: {
      ...state.drafts,
      [documentType]: withUpdatedDraftContent(existingDraft, content, updatedAt),
    },
  };
}

export function resetDraftContent(
  state: DocumentDraftState,
  documentType: DocumentType,
  updatedAt: string,
): DocumentDraftState {
  const existingDraft = state.drafts[documentType];

  if (existingDraft === undefined) {
    return state;
  }

  return {
    ...state,
    drafts: {
      ...state.drafts,
      [documentType]: withResetDraftContent(existingDraft, updatedAt),
    },
  };
}
