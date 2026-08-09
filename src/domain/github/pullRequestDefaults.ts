import {
  getDocumentDisplayName,
  type DocumentType,
} from "../models/documentType";
import type { FileWriteAction } from "./fileExistence";
import { normalizeDestinationPath } from "./destinationPath";

export function getDefaultPullRequestTitle(
  documentType: DocumentType,
  destinationPath: string,
  fileAction: FileWriteAction,
): string {
  const displayName = getDocumentDisplayName(documentType);
  const fileName = normalizeDestinationPath(destinationPath).split("/").at(-1);

  if (fileAction === "improve-readme") {
    return "docs: improve README";
  }

  if (fileAction === "replace") {
    return fileName !== undefined
      ? `docs: update ${fileName}`
      : `docs: update ${displayName}`;
  }

  return fileName !== undefined
    ? `docs: add ${fileName}`
    : `docs: add ${displayName}`;
}

export function getDefaultPullRequestBody(
  documentType: DocumentType,
  destinationPath: string,
  fileAction: FileWriteAction,
): string {
  const displayName = getDocumentDisplayName(documentType);
  const actionSummary =
    fileAction === "improve-readme"
      ? "Improves the existing README using verified repository facts."
      : fileAction === "replace"
        ? `Updates \`${destinationPath}\` using verified repository facts.`
        : `Adds \`${destinationPath}\` using verified repository facts.`;

  return [
    "Generated using RepoReady",
    "",
    `**Document type:** ${displayName}`,
    "",
    "## Summary",
    actionSummary,
    "",
    "Please review the draft carefully before merging.",
  ].join("\n");
}
