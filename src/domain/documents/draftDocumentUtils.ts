import type { DocumentType } from "../models/documentType";
import type { DraftDocument, DraftDocumentAIMetadata } from "../models/draftDocument";

export function computeIsDirty(content: string, originalContent: string): boolean {
  return content !== originalContent;
}

export function withUpdatedDraftContent(
  draft: DraftDocument,
  content: string,
  updatedAt: string,
): DraftDocument {
  const isDirty = computeIsDirty(content, draft.originalContent);

  return {
    ...draft,
    content,
    updatedAt,
    isDirty,
    status: isDirty ? "editing" : "draft",
  };
}

export function withResetDraftContent(
  draft: DraftDocument,
  updatedAt: string,
): DraftDocument {
  return {
    ...draft,
    content: draft.originalContent,
    updatedAt,
    isDirty: false,
    status: "draft",
  };
}

export function createGeneratedDraft(
  draft: Omit<DraftDocument, "originalContent" | "isDirty">,
): DraftDocument {
  return {
    ...draft,
    originalContent: draft.content,
    isDirty: false,
  };
}

export function getDownloadFilename(destinationPath: string): string {
  const normalizedPath = destinationPath.replace(/\\/g, "/");
  const fileName = normalizedPath.split("/").at(-1);

  return fileName !== undefined && fileName.length > 0
    ? fileName
    : destinationPath;
}

export function getDraftStorageKey(
  owner: string,
  repo: string,
  documentType: DocumentType,
): string {
  return `draft:${owner}/${repo}/${documentType}`;
}

export function normalizeStoredDraft(value: unknown): DraftDocument | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const draft = value as Record<string, unknown>;

  if (
    typeof draft.id !== "string" ||
    typeof draft.owner !== "string" ||
    typeof draft.repo !== "string" ||
    typeof draft.documentType !== "string" ||
    typeof draft.destinationPath !== "string" ||
    typeof draft.content !== "string" ||
    typeof draft.status !== "string" ||
    typeof draft.source !== "string" ||
    typeof draft.createdAt !== "string" ||
    typeof draft.updatedAt !== "string" ||
    !Array.isArray(draft.warnings)
  ) {
    return null;
  }

  const originalContent =
    typeof draft.originalContent === "string" ? draft.originalContent : draft.content;
  const content = draft.content;
  const aiMetadata = parseAIMetadata(draft.aiMetadata);

  return {
    id: draft.id,
    owner: draft.owner,
    repo: draft.repo,
    documentType: draft.documentType as DraftDocument["documentType"],
    destinationPath: draft.destinationPath,
    content,
    originalContent,
    isDirty:
      typeof draft.isDirty === "boolean"
        ? draft.isDirty
        : computeIsDirty(content, originalContent),
    warnings: draft.warnings.filter((warning): warning is string => typeof warning === "string"),
    status: draft.status as DraftDocument["status"],
    source: draft.source as DraftDocument["source"],
    aiMetadata,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

function parseAIMetadata(value: unknown): DraftDocumentAIMetadata | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const metadata = value as Record<string, unknown>;

  if (
    typeof metadata.provider !== "string" ||
    typeof metadata.model !== "string"
  ) {
    return undefined;
  }

  return {
    provider: metadata.provider,
    model: metadata.model,
  };
}
