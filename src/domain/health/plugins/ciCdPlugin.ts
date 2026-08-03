import type { RepositoryFacts } from "../../models/repositoryFacts";
import type {
  CheckResult,
  HealthPlugin,
  Recommendation,
} from "../../models/healthReport";
import {
  buildPluginResult,
  createFailedCheck,
  createPassedCheck,
  createUndeterminedCheck,
} from "../plugin-utils";
import {
  contentIncludesTestCommand,
  loadedWorkflowContents,
} from "../workflow-analysis";

const CATEGORY_ID = "ci-cd";
const CATEGORY_LABEL = "CI/CD";

const WORKFLOWS_EXIST_POINTS = 6;
const WORKFLOW_TESTS_POINTS = 4;

export class CiCdHealthPlugin implements HealthPlugin {
  readonly id = CATEGORY_ID;
  readonly categoryLabel = CATEGORY_LABEL;
  readonly maxPoints = 10;

  analyze(facts: RepositoryFacts) {
    const checks: CheckResult[] = [
      this.checkWorkflowsExist(facts),
      this.checkWorkflowRunsTests(facts),
    ];

    const recommendations = checks.flatMap((check) =>
      this.recommendationForCheck(check),
    );

    return buildPluginResult(
      CATEGORY_ID,
      CATEGORY_LABEL,
      this.maxPoints,
      checks,
      recommendations,
    );
  }

  private checkWorkflowsExist(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "github-actions-workflows",
      label: "GitHub Actions workflows exist",
      pointsAvailable: WORKFLOWS_EXIST_POINTS,
      detectionMethod: "RepositoryFacts.workflowFiles",
    };

    if (facts.workflowFiles.length > 0) {
      return createPassedCheck({
        ...base,
        explanation: `Detected ${String(facts.workflowFiles.length)} GitHub Actions workflow file(s).`,
      });
    }

    return createFailedCheck({
      ...base,
      explanation: "No GitHub Actions workflow files were detected.",
    });
  }

  private checkWorkflowRunsTests(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "workflow-runs-tests",
      label: "Workflow runs tests",
      pointsAvailable: WORKFLOW_TESTS_POINTS,
      detectionMethod: "Loaded GitHub Actions workflow content for recognized test commands",
    };

    if (facts.workflowFiles.length === 0) {
      return createFailedCheck({
        ...base,
        explanation: "No workflows exist, so CI test execution was not detected.",
      });
    }

    const loadedContents = loadedWorkflowContents(facts.workflowFiles);

    if (loadedContents.length === 0) {
      return createUndeterminedCheck({
        ...base,
        explanation:
          "Workflow files exist, but their contents were unavailable or skipped.",
      });
    }

    if (loadedContents.some((content) => contentIncludesTestCommand(content))) {
      return createPassedCheck({
        ...base,
        explanation: "At least one workflow contains a recognized test command.",
      });
    }

    return createFailedCheck({
      ...base,
      explanation: "No recognized test commands were found in loaded workflow files.",
    });
  }

  private recommendationForCheck(check: CheckResult): Recommendation[] {
    if (check.status === "passed" || check.status === "undetermined") {
      return [];
    }

    switch (check.id) {
      case "github-actions-workflows":
        return [
          {
            id: "ci-cd-add-workflows",
            categoryId: CATEGORY_ID,
            title: "Add GitHub Actions workflows",
            description:
              "Create .github/workflows files so the repository has automated CI.",
            actionType: "manual-fix",
            potentialPoints: check.pointsAvailable,
          },
        ];
      case "workflow-runs-tests":
        return [
          {
            id: "ci-cd-run-tests-in-workflow",
            categoryId: CATEGORY_ID,
            title: "Run tests in CI",
            description:
              "Update GitHub Actions workflows to run a recognized test command.",
            actionType: "manual-fix",
            potentialPoints: check.pointsAvailable,
          },
        ];
      default:
        return [];
    }
  }
}

export const ciCdHealthPlugin = new CiCdHealthPlugin();
