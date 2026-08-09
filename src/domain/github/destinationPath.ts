import type { DocumentType } from "../models/documentType";
import {
  getDocumentDestinationPath,
  getDocumentDisplayName,
} from "../models/documentType";

export const README_DESTINATION_PATH = "README.md";

export function resolveDestinationPath(
  documentType: DocumentType,
  overridePath?: string,
): string {
  const trimmedOverride = overridePath?.trim();

  if (trimmedOverride !== undefined && trimmedOverride.length > 0) {
    return normalizeDestinationPath(trimmedOverride);
  }

  return getDocumentDestinationPath(documentType);
}

export function normalizeDestinationPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
}

export function isReadmeDestination(path: string): boolean {
  return normalizeDestinationPath(path).toLowerCase() === README_DESTINATION_PATH.toLowerCase();
}

export function getDestinationFileLabel(documentType: DocumentType): string {
  return getDocumentDisplayName(documentType);
}
