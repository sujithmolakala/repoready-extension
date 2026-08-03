import type { FileEntry, RepositoryFacts } from "../models/repositoryFacts";
import type { CheckResult, PluginResult, Recommendation } from "../models/healthReport";

export function buildPluginResult(
  categoryId: string,
  categoryLabel: string,
  maxPoints: number,
  checks: CheckResult[],
  recommendations: Recommendation[],
): PluginResult {
  const pointsAwarded = checks.reduce(
    (total, check) => total + check.pointsAwarded,
    0,
  );

  return {
    categoryId,
    categoryLabel,
    pointsAwarded,
    maxPoints,
    checks,
    recommendations,
  };
}

export function createPassedCheck(
  check: Omit<CheckResult, "status" | "pointsAwarded"> & { status?: "passed" },
): CheckResult {
  return {
    ...check,
    status: "passed",
    pointsAwarded: check.pointsAvailable,
  };
}

export function createFailedCheck(
  check: Omit<CheckResult, "status" | "pointsAwarded"> & { status?: "failed" },
): CheckResult {
  return {
    ...check,
    status: "failed",
    pointsAwarded: 0,
  };
}

export function createUndeterminedCheck(
  check: Omit<CheckResult, "status" | "pointsAwarded">,
): CheckResult {
  return {
    ...check,
    status: "undetermined",
    pointsAwarded: 0,
  };
}

export function hasRepositoryPath(
  facts: RepositoryFacts,
  candidatePaths: readonly string[],
): boolean {
  const normalizedCandidates = new Set(
    candidatePaths.map((path) => normalizePath(path)),
  );

  for (const entry of facts.rootEntries) {
    if (entry.type === "file" && normalizedCandidates.has(normalizePath(entry.path))) {
      return true;
    }
  }

  for (const entry of facts.githubEntries) {
    const normalizedPath = normalizePath(entry.path);

    if (normalizedCandidates.has(normalizedPath)) {
      return true;
    }

    if (entry.type === "dir") {
      for (const candidate of normalizedCandidates) {
        if (candidate.startsWith(`${normalizedPath}/`)) {
          return true;
        }
      }
    }
  }

  return facts.tree.paths.some((path) => normalizedCandidates.has(normalizePath(path)));
}

export function hasDirectoryPath(
  facts: RepositoryFacts,
  directoryPaths: readonly string[],
): boolean {
  const normalizedDirectories = directoryPaths.map((path) => normalizePath(path));

  for (const entry of facts.githubEntries) {
    if (
      entry.type === "dir" &&
      normalizedDirectories.includes(normalizePath(entry.path))
    ) {
      return true;
    }
  }

  return facts.tree.paths.some((path) => {
    const normalizedPath = normalizePath(path);

    return normalizedDirectories.some(
      (directoryPath) =>
        normalizedPath === directoryPath ||
        normalizedPath.startsWith(`${directoryPath}/`),
    );
  });
}

export function hasMeaningfulText(value: string | null, minimumLength: number): boolean {
  if (value === null) {
    return false;
  }

  return value.trim().length >= minimumLength;
}

export function hasNonEmptyText(value: string | null): boolean {
  return value !== null && value.trim().length > 0;
}

export function hasRootDirectory(
  rootEntries: FileEntry[],
  directoryName: string,
): boolean {
  const normalizedDirectoryName = directoryName.toLowerCase();

  return rootEntries.some(
    (entry) =>
      entry.type === "dir" &&
      entry.name.toLowerCase() === normalizedDirectoryName,
  );
}

export function hasRepositoryFileInLocations(
  facts: RepositoryFacts,
  fileNames: readonly string[],
  locationPrefixes: readonly string[],
): boolean {
  const normalizedFileNames = new Set(
    fileNames.map((fileName) => fileName.toLowerCase()),
  );
  const normalizedPrefixes = locationPrefixes.map((prefix) =>
    normalizePath(prefix),
  );

  for (const entry of [...facts.rootEntries, ...facts.githubEntries]) {
    if (entry.type !== "file") {
      continue;
    }

    if (!normalizedFileNames.has(entry.name.toLowerCase())) {
      continue;
    }

    const entryPrefix = entry.path.includes("/")
      ? normalizePath(entry.path.slice(0, entry.path.lastIndexOf("/")))
      : "";

    if (normalizedPrefixes.includes(entryPrefix)) {
      return true;
    }
  }

  return facts.tree.paths.some((path) =>
    pathMatchesLocatedFile(path, normalizedFileNames, normalizedPrefixes),
  );
}

export function hasRepositoryDirectoryInLocations(
  facts: RepositoryFacts,
  directoryPaths: readonly string[],
): boolean {
  const normalizedDirectoryPaths = directoryPaths.map((path) => normalizePath(path));

  for (const entry of [...facts.rootEntries, ...facts.githubEntries]) {
    if (
      entry.type === "dir" &&
      normalizedDirectoryPaths.includes(normalizePath(entry.path))
    ) {
      return true;
    }
  }

  return facts.tree.paths.some((path) => {
    const normalizedPath = normalizePath(path);

    return normalizedDirectoryPaths.some(
      (directoryPath) =>
        normalizedPath === directoryPath ||
        normalizedPath.startsWith(`${directoryPath}/`),
    );
  });
}

function pathMatchesLocatedFile(
  path: string,
  fileNames: Set<string>,
  locationPrefixes: readonly string[],
): boolean {
  const normalizedPath = normalizePath(path);
  const fileName = normalizedPath.split("/").at(-1)?.toLowerCase();

  if (fileName === undefined || !fileNames.has(fileName)) {
    return false;
  }

  const prefix = normalizedPath.includes("/")
    ? normalizedPath.slice(0, normalizedPath.lastIndexOf("/"))
    : "";

  return locationPrefixes.includes(prefix);
}

export function findRootFile(
  rootEntries: FileEntry[],
  fileName: string,
): FileEntry | undefined {
  return rootEntries.find(
    (entry) => entry.type === "file" && entry.name === fileName,
  );
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}
