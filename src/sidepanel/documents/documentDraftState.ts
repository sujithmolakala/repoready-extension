import type { DraftDocument } from "../../domain/models/draftDocument";
import type { DocumentType } from "../../domain/models/documentType";

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
