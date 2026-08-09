import type { RepositoryFacts } from "../models/repositoryFacts";
import { normalizeDestinationPath, isReadmeDestination } from "./destinationPath";

export function fileExistsAtPath(
  facts: RepositoryFacts,
  destinationPath: string,
): boolean {
  const normalizedDestination = normalizeDestinationPath(destinationPath);

  if (isReadmeDestination(normalizedDestination)) {
    return facts.readme.exists;
  }

  for (const entry of [...facts.rootEntries, ...facts.githubEntries]) {
    if (normalizeDestinationPath(entry.path) === normalizedDestination) {
      return true;
    }
  }

  return facts.tree.paths.some(
    (path) => normalizeDestinationPath(path) === normalizedDestination,
  );
}

export type FileWriteAction = "create" | "replace" | "improve-readme";

export function detectFileWriteAction(
  facts: RepositoryFacts,
  destinationPath: string,
): FileWriteAction {
  const exists = fileExistsAtPath(facts, destinationPath);

  if (!exists) {
    return "create";
  }

  if (isReadmeDestination(destinationPath)) {
    return "improve-readme";
  }

  return "replace";
}

export function getFileActionLabel(action: FileWriteAction): string {
  switch (action) {
    case "create":
      return "Create new file";
    case "replace":
      return "Replace existing file";
    case "improve-readme":
      return "Improve existing README";
  }
}
