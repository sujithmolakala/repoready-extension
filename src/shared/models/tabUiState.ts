import type { DocumentType } from "../../domain/models/documentType";

export interface RepositoryUiState {
  scrollTop: number;
  expandedCategoryIds: string[];
  openInsightSectionIds: string[];
  selectedDocumentType: DocumentType | null;
  documentMode: "preview" | "edit";
}

export const SIDE_PANEL_OPEN_TABS_SESSION_KEY = "sidepanel-open-tab-ids";

export function createEmptyRepositoryUiState(): RepositoryUiState {
  return {
    scrollTop: 0,
    expandedCategoryIds: [],
    openInsightSectionIds: ["language"],
    selectedDocumentType: null,
    documentMode: "preview",
  };
}

export function tabUiStorageKey(tabId: number, repositoryKey: string): string {
  return `tab-ui:${String(tabId)}:${repositoryKey}`;
}

export function isTabUiStorageKey(key: string): boolean {
  return key.startsWith("tab-ui:");
}

export function parseTabUiStorageKey(key: string): {
  tabId: number;
  repositoryKey: string;
} | null {
  if (!isTabUiStorageKey(key)) {
    return null;
  }

  const remainder = key.slice("tab-ui:".length);
  const separatorIndex = remainder.indexOf(":");

  if (separatorIndex <= 0) {
    return null;
  }

  const tabId = Number.parseInt(remainder.slice(0, separatorIndex), 10);
  const repositoryKey = remainder.slice(separatorIndex + 1);

  if (!Number.isFinite(tabId) || repositoryKey.length === 0) {
    return null;
  }

  return { tabId, repositoryKey };
}

export function isRepositoryUiState(value: unknown): value is RepositoryUiState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const state = value as Record<string, unknown>;

  return (
    typeof state.scrollTop === "number" &&
    Array.isArray(state.expandedCategoryIds) &&
    Array.isArray(state.openInsightSectionIds) &&
    (state.selectedDocumentType === null ||
      typeof state.selectedDocumentType === "string") &&
    (state.documentMode === "preview" || state.documentMode === "edit")
  );
}
