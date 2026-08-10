import type { RepositoryFacts } from "../models/repositoryFacts";
import type { HealthReport } from "../models/healthReport";
import {
  hasDocumentationLink,
  hasSetupHeading,
  hasTestingGuidance,
  hasUsageHeading,
} from "../health/readme-analysis";
import type { InsightItem } from "./types";

export function analyzeDocumentationQualityInsights(
  facts: RepositoryFacts,
  report: HealthReport,
): InsightItem[] {
  const readmeContent = facts.readme.content;
  const documentationCategory = report.categories.find(
    (category) => category.categoryId === "documentation",
  );

  const items: InsightItem[] = [
    {
      id: "docs-readme-length",
      categoryId: "documentation-quality",
      label: "README length",
      status:
        readmeContent === null
          ? "undetermined"
          : readmeContent.trim().length >= 200
            ? "passed"
            : "undetermined",
      explanation:
        readmeContent === null
          ? "README content was unavailable for length analysis."
          : `README is approximately ${String(readmeContent.trim().length)} characters.`,
    },
    headingInsight("docs-setup-heading", "Setup heading", hasSetupHeading, readmeContent),
    headingInsight("docs-usage-heading", "Usage heading", hasUsageHeading, readmeContent),
    headingInsight(
      "docs-testing-heading",
      "Testing guidance",
      hasTestingGuidance,
      readmeContent,
    ),
    {
      id: "docs-link",
      categoryId: "documentation-quality",
      label: "Documentation link",
      status:
        readmeContent !== null && hasDocumentationLink(readmeContent)
          ? "passed"
          : "failed",
      explanation:
        readmeContent !== null && hasDocumentationLink(readmeContent)
          ? "README links to project documentation."
          : "No documentation link detected in README.",
    },
    checkMirrorInsight(documentationCategory, "changelog-present", "Changelog"),
    checkMirrorInsight(documentationCategory, "docs-directory-or-link", "Docs directory/link"),
  ];

  const hasContributing =
    facts.tree.paths.some((path) => path.toLowerCase().includes("contributing")) ||
    facts.rootEntries.some((entry) => entry.name.toLowerCase().includes("contributing"));

  items.push({
    id: "docs-contributing",
    categoryId: "documentation-quality",
    label: "Contributing documentation",
    status: hasContributing ? "passed" : "undetermined",
    explanation: hasContributing
      ? "Contributing documentation detected."
      : "No contributing file detected from tree paths.",
  });

  const hasArchitectureDoc = facts.tree.paths.some(
    (path) => path === "docs/architecture.md" || path.endsWith("/architecture.md"),
  );

  items.push({
    id: "docs-architecture",
    categoryId: "documentation-quality",
    label: "Architecture documentation",
    status: hasArchitectureDoc ? "passed" : "undetermined",
    explanation: hasArchitectureDoc
      ? "Architecture documentation file detected."
      : "No architecture doc detected in docs/.",
  });

  return items;
}

function headingInsight(
  id: string,
  label: string,
  evaluator: (content: string) => boolean,
  readmeContent: string | null,
): InsightItem {
  if (readmeContent === null) {
    return {
      id,
      categoryId: "documentation-quality",
      label,
      status: "undetermined",
      explanation: "README content unavailable.",
    };
  }

  return {
    id,
    categoryId: "documentation-quality",
    label,
    status: evaluator(readmeContent) ? "passed" : "failed",
    explanation: evaluator(readmeContent)
      ? `${label} detected in README.`
      : `${label} missing or not recognized in README.`,
  };
}

function checkMirrorInsight(
  category: import("../models/healthReport").PluginResult | undefined,
  checkId: string,
  label: string,
): InsightItem {
  const check = category?.checks.find((item) => item.id === checkId);

  return {
    id: `docs-${checkId}`,
    categoryId: "documentation-quality",
    label,
    status: check?.status ?? "undetermined",
    explanation: check?.explanation ?? `${label} status unavailable.`,
  };
}
