import type { RepositoryFacts } from "../models/repositoryFacts";
import type { InsightItem } from "./types";

const RISKY_COMMITTED_FILES = [".env", ".env.local", ".env.production"] as const;

export function analyzeSecurityInsights(facts: RepositoryFacts): InsightItem[] {
  const items: InsightItem[] = [];

  const hasSecurityPolicy =
    facts.tree.paths.some((path) =>
      ["SECURITY.md", "SECURITY", "SECURITY.rst"].includes(path.split("/").at(-1) ?? ""),
    ) ||
    facts.githubEntries.some((entry) => entry.name.startsWith("SECURITY"));

  items.push({
    id: "security-policy-info",
    categoryId: "security",
    label: "Security policy present",
    status: hasSecurityPolicy ? "passed" : "failed",
    explanation: hasSecurityPolicy
      ? "SECURITY policy file detected."
      : "No SECURITY policy file detected.",
  });

  const hasDependabot = facts.tree.paths.some(
    (path) =>
      path === ".github/dependabot.yml" || path === ".github/dependabot.yaml",
  );

  items.push({
    id: "security-dependabot-info",
    categoryId: "security",
    label: "Dependency update automation",
    status: hasDependabot ? "passed" : "failed",
    explanation: hasDependabot
      ? "Dependabot configuration detected."
      : "No Dependabot configuration detected.",
  });

  items.push({
    id: "security-ci-validation",
    categoryId: "security",
    label: "CI validation workflows",
    status: facts.workflowFiles.length > 0 ? "passed" : "undetermined",
    explanation:
      facts.workflowFiles.length > 0
        ? "GitHub Actions workflows are present for automated validation."
        : "No CI workflows detected.",
  });

  const riskyFile = RISKY_COMMITTED_FILES.find((fileName) =>
    facts.tree.paths.some((path) => path.split("/").at(-1) === fileName),
  );

  items.push({
    id: "security-risky-filename",
    categoryId: "security",
    label: "Sensitive filename warning",
    status: riskyFile !== undefined ? "failed" : "passed",
    explanation:
      riskyFile !== undefined
        ? `A potentially sensitive committed file was detected: ${riskyFile}.`
        : "No commonly risky committed env files detected in tree paths.",
  });

  return items;
}
