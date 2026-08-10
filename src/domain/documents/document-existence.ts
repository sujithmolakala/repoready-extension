import type { DocumentType } from "../models/documentType";
import { getDocumentDestinationPath, isReadmeImprovementType } from "../models/documentType";
import type { RepositoryFacts } from "../models/repositoryFacts";
import {
  hasRepositoryFileInLocations,
} from "../health/plugin-utils";

const ROOT_AND_GITHUB = ["", ".github"] as const;

export function documentExistsAtDestination(
  facts: RepositoryFacts,
  documentType: DocumentType,
): boolean {
  if (isReadmeImprovementType(documentType)) {
    return false;
  }

  const destinationPath = getDocumentDestinationPath(documentType);

  if (pathExists(facts, destinationPath)) {
    return true;
  }

  return hasAlternatePaths(facts, documentType);
}

function hasAlternatePaths(
  facts: RepositoryFacts,
  documentType: DocumentType,
): boolean {
  switch (documentType) {
    case "CONTRIBUTING":
      return hasRepositoryFileInLocations(
        facts,
        ["CONTRIBUTING.md", "CONTRIBUTING", "CONTRIBUTING.rst"],
        ROOT_AND_GITHUB,
      );
    case "CODE_OF_CONDUCT":
      return hasRepositoryFileInLocations(
        facts,
        ["CODE_OF_CONDUCT.md", "CODE_OF_CONDUCT", "CODE_OF_CONDUCT.rst"],
        ROOT_AND_GITHUB,
      );
    case "SECURITY":
      return hasRepositoryFileInLocations(
        facts,
        ["SECURITY.md", "SECURITY", "SECURITY.rst"],
        ROOT_AND_GITHUB,
      );
    case "CHANGELOG":
      return hasRepositoryFileInLocations(
        facts,
        ["CHANGELOG.md", "CHANGELOG", "CHANGES.md", "HISTORY.md"],
        [""],
      );
    case "ISSUE_TEMPLATE_BUG":
      return pathExists(facts, ".github/ISSUE_TEMPLATE/bug_report.md");
    case "ISSUE_TEMPLATE_FEATURE":
      return pathExists(facts, ".github/ISSUE_TEMPLATE/feature_request.md");
    case "PULL_REQUEST_TEMPLATE":
      return (
        hasRepositoryFileInLocations(
          facts,
          ["PULL_REQUEST_TEMPLATE.md"],
          ["", ".github", "docs"],
        ) ||
        facts.githubEntries.some(
          (entry) =>
            entry.type === "dir" && entry.path === ".github/PULL_REQUEST_TEMPLATE",
        )
      );
    case "DOCUMENTATION":
      return pathExists(facts, "docs/getting-started.md");
    case "README_IMPROVEMENT":
    case "README_SETUP":
    case "README_TESTING":
      return false;
  }
}

function pathExists(facts: RepositoryFacts, destinationPath: string): boolean {
  const normalizedDestination = normalizePath(destinationPath);

  for (const entry of [...facts.rootEntries, ...facts.githubEntries]) {
    if (normalizePath(entry.path) === normalizedDestination) {
      return true;
    }
  }

  return facts.tree.paths.some(
    (path) => normalizePath(path) === normalizedDestination,
  );
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}
