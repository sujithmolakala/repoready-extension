import type { RepositoryFacts } from "../models/repositoryFacts";
import { hasDependencyManifest } from "../health/test-detection";
import { detectPackageManager } from "../documents/repository-fact-helpers";
import type { InsightItem } from "./types";
import { detectPrimaryLanguage, hasLockfile } from "./languageDetection";

export function analyzeDependencyHealthInsights(
  facts: RepositoryFacts,
): InsightItem[] {
  const language = detectPrimaryLanguage(facts);
  const packageManager = detectPackageManager(facts);
  const items: InsightItem[] = [
    {
      id: "dep-manifest",
      categoryId: "dependency-health",
      label: "Dependency manifest exists",
      status: hasDependencyManifest(facts) ? "passed" : "failed",
      explanation: hasDependencyManifest(facts)
        ? "A recognized dependency manifest was detected."
        : "No recognized dependency manifest was found.",
    },
    {
      id: "dep-package-manager",
      categoryId: "dependency-health",
      label: "Package manager determined",
      status: packageManager !== null ? "passed" : "undetermined",
      explanation:
        packageManager !== null
          ? `Detected ${packageManager} from lockfile evidence.`
          : "Could not determine a single package manager from lockfiles.",
    },
    dependabotInsight(facts),
    lockfileConsistencyInsight(facts, language),
  ];

  return items;
}

function dependabotInsight(facts: RepositoryFacts): InsightItem {
  const hasDependabot =
    facts.tree.paths.some(
      (path) =>
        path === ".github/dependabot.yml" || path === ".github/dependabot.yaml",
    ) ||
    facts.githubEntries.some(
      (entry) =>
        entry.path === ".github/dependabot.yml" ||
        entry.path === ".github/dependabot.yaml",
    );

  return {
    id: "dep-dependabot",
    categoryId: "dependency-health",
    label: "Dependabot configured",
    status: hasDependabot ? "passed" : "failed",
    explanation: hasDependabot
      ? "Dependabot configuration detected."
      : "No Dependabot configuration was found.",
  };
}

function lockfileConsistencyInsight(
  facts: RepositoryFacts,
  language: ReturnType<typeof detectPrimaryLanguage>,
): InsightItem {
  if (language === "javascript" || language === "typescript") {
    const hasPackageJson = facts.dependencyFiles.some(
      (file) => file.name === "package.json",
    );

    if (!hasPackageJson) {
      return {
        id: "dep-lockfile-consistency",
        categoryId: "dependency-health",
        label: "Lockfile consistency",
        status: "undetermined",
        explanation: "No package.json found for lockfile analysis.",
      };
    }

    const hasNodeLockfile =
      hasLockfile(facts, "package-lock.json") ||
      hasLockfile(facts, "yarn.lock") ||
      hasLockfile(facts, "pnpm-lock.yaml");

    return {
      id: "dep-lockfile-consistency",
      categoryId: "dependency-health",
      label: "Lockfile present for Node project",
      status: hasNodeLockfile ? "passed" : "failed",
      explanation: hasNodeLockfile
        ? "A Node lockfile was detected alongside package.json."
        : "package.json exists but no conventional lockfile was detected.",
    };
  }

  if (language === "go") {
    const hasGoMod = facts.tree.paths.some((path) => path.endsWith("go.mod"));

    return {
      id: "dep-lockfile-consistency",
      categoryId: "dependency-health",
      label: "go.sum present",
      status: hasGoMod
        ? hasLockfile(facts, "go.sum")
          ? "passed"
          : "undetermined"
        : "undetermined",
      explanation: hasGoMod
        ? hasLockfile(facts, "go.sum")
          ? "go.sum detected alongside go.mod."
          : "go.mod found without go.sum; this may be acceptable for libraries."
        : "No go.mod found.",
    };
  }

  if (language === "rust") {
    const hasCargo = facts.tree.paths.some((path) => path.endsWith("Cargo.toml"));

    return {
      id: "dep-lockfile-consistency",
      categoryId: "dependency-health",
      label: "Cargo.lock present",
      status: hasCargo
        ? hasLockfile(facts, "Cargo.lock")
          ? "passed"
          : "undetermined"
        : "undetermined",
      explanation: hasCargo
        ? hasLockfile(facts, "Cargo.lock")
          ? "Cargo.lock detected."
          : "Cargo.toml without Cargo.lock may be normal for libraries."
        : "No Cargo.toml found.",
    };
  }

  return {
    id: "dep-lockfile-consistency",
    categoryId: "dependency-health",
    label: "Lockfile consistency",
    status: "undetermined",
    explanation: "Lockfile expectations depend on ecosystem and were not evaluated.",
  };
}
