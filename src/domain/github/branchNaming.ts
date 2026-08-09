import type { DocumentType } from "../models/documentType";
import { isReadmeDestination, normalizeDestinationPath } from "./destinationPath";

const DOCUMENT_BRANCH_SUFFIXES: Record<DocumentType, string> = {
  CONTRIBUTING: "contributing",
  CODE_OF_CONDUCT: "code-of-conduct",
  SECURITY: "security",
  CHANGELOG: "changelog",
  ISSUE_TEMPLATE_BUG: "issue-template-bug",
  ISSUE_TEMPLATE_FEATURE: "issue-template-feature",
  PULL_REQUEST_TEMPLATE: "pull-request-template",
};

const BRANCH_PREFIX = "repoready/docs";

export function getBranchSuffix(
  documentType: DocumentType,
  destinationPath: string,
): string {
  if (isReadmeDestination(destinationPath)) {
    return "readme";
  }

  return DOCUMENT_BRANCH_SUFFIXES[documentType];
}

export function buildBaseBranchName(
  documentType: DocumentType,
  destinationPath: string,
): string {
  const suffix = getBranchSuffix(documentType, destinationPath);
  return `${BRANCH_PREFIX}/${suffix}`;
}

export function resolveUniqueBranchName(
  baseBranchName: string,
  existingBranchNames: readonly string[],
): string {
  const normalizedExisting = new Set(
    existingBranchNames.map((name) => name.toLowerCase()),
  );

  if (!normalizedExisting.has(baseBranchName.toLowerCase())) {
    return baseBranchName;
  }

  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const candidate = `${baseBranchName}-${String(suffix)}`;

    if (!normalizedExisting.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return `${baseBranchName}-${String(Date.now())}`;
}

export function branchNameFromDestination(destinationPath: string): string {
  const normalized = normalizeDestinationPath(destinationPath)
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${BRANCH_PREFIX}/${normalized.length > 0 ? normalized : "document"}`;
}
