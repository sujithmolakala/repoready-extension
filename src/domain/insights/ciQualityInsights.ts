import type { RepositoryFacts } from "../models/repositoryFacts";
import {
  contentIncludesTestCommand,
  loadedWorkflowContents,
} from "../health/workflow-analysis";
import type { InsightItem } from "./types";

const BUILD_COMMAND_PATTERNS = [
  "npm run build",
  "pnpm run build",
  "yarn build",
  "go build",
  "cargo build",
  "mvn package",
  "./gradlew build",
  "gradle build",
] as const;

const LINT_COMMAND_PATTERNS = [
  "npm run lint",
  "pnpm run lint",
  "yarn lint",
  "eslint",
  "ruff check",
  "flake8",
  "golangci-lint",
] as const;

export function analyzeCiQualityInsights(facts: RepositoryFacts): InsightItem[] {
  if (facts.workflowFiles.length === 0) {
    return [
      {
        id: "ci-no-workflows",
        categoryId: "ci-quality",
        label: "CI workflows",
        status: "failed",
        explanation: "No GitHub Actions workflows were detected.",
      },
    ];
  }

  const contents = loadedWorkflowContents(facts.workflowFiles);

  if (contents.length === 0) {
    return [
      {
        id: "ci-content-unavailable",
        categoryId: "ci-quality",
        label: "CI workflow analysis",
        status: "undetermined",
        explanation: "Workflow files exist but contents were unavailable.",
      },
    ];
  }

  const combined = contents.join("\n");

  return [
    triggerInsight("ci-push-trigger", "push trigger", combined.includes("push:")),
    triggerInsight(
      "ci-pull-request-trigger",
      "pull_request trigger",
      combined.includes("pull_request:") || combined.includes("pull_request "),
    ),
    commandInsight(
      "ci-runs-build",
      "Build step",
      BUILD_COMMAND_PATTERNS.some((pattern) => combined.includes(pattern)),
    ),
    commandInsight(
      "ci-runs-lint",
      "Lint step",
      LINT_COMMAND_PATTERNS.some((pattern) => combined.includes(pattern)),
    ),
    {
      id: "ci-runs-tests",
      categoryId: "ci-quality",
      label: "Test step",
      status: contents.some((content) => contentIncludesTestCommand(content))
        ? "passed"
        : "undetermined",
      explanation: contents.some((content) => contentIncludesTestCommand(content))
        ? "At least one workflow contains a recognized test command."
        : "No recognized test command found in loaded workflows.",
    },
  ];
}

function triggerInsight(id: string, label: string, present: boolean): InsightItem {
  return {
    id,
    categoryId: "ci-quality",
    label,
    status: present ? "passed" : "undetermined",
    explanation: present
      ? `Workflow includes a ${label}.`
      : `${label} was not detected in workflow contents.`,
  };
}

function commandInsight(id: string, label: string, present: boolean): InsightItem {
  return {
    id,
    categoryId: "ci-quality",
    label,
    status: present ? "passed" : "undetermined",
    explanation: present
      ? `${label} detected in workflow contents.`
      : `${label} not detected (custom commands may still provide equivalent coverage).`,
  };
}
