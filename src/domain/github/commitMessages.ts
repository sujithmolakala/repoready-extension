import type { DocumentType } from "../models/documentType";
import { getDocumentDisplayName } from "../models/documentType";
import type { FileWriteAction } from "./fileExistence";
import { isReadmeDestination, normalizeDestinationPath } from "./destinationPath";

export function getDefaultCommitMessage(
  documentType: DocumentType,
  destinationPath: string,
  fileAction: FileWriteAction,
): string {
  if (isReadmeDestination(destinationPath)) {
    return fileAction === "improve-readme"
      ? "docs: improve README"
      : "docs: add README";
  }

  const fileName = normalizeDestinationPath(destinationPath).split("/").at(-1);

  if (fileName === undefined || fileName.length === 0) {
    return `docs: add ${getDocumentDisplayName(documentType)}`;
  }

  if (fileAction === "replace") {
    return `docs: update ${fileName}`;
  }

  return `docs: add ${fileName}`;
}
