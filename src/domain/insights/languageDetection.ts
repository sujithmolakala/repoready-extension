import type { RepositoryFacts } from "../models/repositoryFacts";
import { findLoadedManifest } from "../health/test-detection";

export type DetectedLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "go"
  | "rust"
  | "java"
  | "unknown";

const LANGUAGE_ALIASES: Record<string, DetectedLanguage> = {
  JavaScript: "javascript",
  TypeScript: "typescript",
  Python: "python",
  Go: "go",
  Rust: "rust",
  Java: "java",
};

function mapGitHubLanguage(language: string): DetectedLanguage | undefined {
  return LANGUAGE_ALIASES[language];
}

export function detectPrimaryLanguage(
  facts: RepositoryFacts,
): DetectedLanguage {
  if (facts.primaryLanguage !== null) {
    const mapped = mapGitHubLanguage(facts.primaryLanguage);

    if (mapped) {
      return mapped;
    }
  }

  if (findLoadedManifest(facts, "package.json") !== undefined) {
    return hasTypeScriptEvidence(facts) ? "typescript" : "javascript";
  }

  if (
    hasPath(facts, "requirements.txt") ||
    hasPath(facts, "pyproject.toml") ||
    hasPath(facts, "Pipfile")
  ) {
    return "python";
  }

  if (hasPath(facts, "go.mod")) {
    return "go";
  }

  if (hasPath(facts, "Cargo.toml")) {
    return "rust";
  }

  if (
    hasPath(facts, "pom.xml") ||
    hasPath(facts, "build.gradle") ||
    hasPath(facts, "build.gradle.kts")
  ) {
    return "java";
  }

  return "unknown";
}

function hasTypeScriptEvidence(facts: RepositoryFacts): boolean {
  return (
    hasPath(facts, "tsconfig.json") ||
    facts.tree.paths.some((path) => path.endsWith(".ts") || path.endsWith(".tsx"))
  );
}

function hasPath(facts: RepositoryFacts, targetPath: string): boolean {
  const normalized = targetPath.toLowerCase();

  if (
    facts.rootEntries.some(
      (entry) => entry.type === "file" && entry.path.toLowerCase() === normalized,
    )
  ) {
    return true;
  }

  return facts.tree.paths.some((path) => path.toLowerCase() === normalized);
}

export function hasLockfile(facts: RepositoryFacts, lockfileName: string): boolean {
  return (
    facts.rootEntries.some(
      (entry) => entry.type === "file" && entry.name === lockfileName,
    ) ||
    facts.dependencyFiles.some((file) => file.name === lockfileName) ||
    facts.tree.paths.some((path) => path.split("/").at(-1) === lockfileName)
  );
}

export function hasConfigFile(facts: RepositoryFacts, configName: string): boolean {
  return hasPath(facts, configName);
}
