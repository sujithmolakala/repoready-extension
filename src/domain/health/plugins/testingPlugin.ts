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
  canEvaluateRustTestFramework,
  findLoadedManifest,
  hasGoTestFiles,
  hasRecognizedTestFramework,
  hasTestPaths,
} from "../test-detection";

const CATEGORY_ID = "testing";
const CATEGORY_LABEL = "Testing";

const TEST_FILES_POINTS = 8;
const TEST_FRAMEWORK_POINTS = 7;

export class TestingHealthPlugin implements HealthPlugin {
  readonly id = CATEGORY_ID;
  readonly categoryLabel = CATEGORY_LABEL;
  readonly maxPoints = 15;

  analyze(facts: RepositoryFacts) {
    const checks: CheckResult[] = [
      this.checkTestFiles(facts),
      this.checkTestFramework(facts),
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

  private checkTestFiles(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "test-files-exist",
      label: "Test files or test directory exist",
      pointsAvailable: TEST_FILES_POINTS,
      detectionMethod:
        "Tree paths matching test directories or test/spec filename patterns",
    };

    if (facts.tree.skipped) {
      return createUndeterminedCheck({
        ...base,
        explanation: "Tree collection was skipped, so test files could not be verified.",
      });
    }

    if (hasTestPaths(facts.tree.paths) || hasGoTestFiles(facts.tree.paths)) {
      return createPassedCheck({
        ...base,
        explanation: "Test directories or test/spec files were detected in the tree.",
      });
    }

    if (facts.tree.truncated) {
      return createUndeterminedCheck({
        ...base,
        explanation:
          "The tree response was truncated, so missing test files cannot be proven.",
      });
    }

    return createFailedCheck({
      ...base,
      explanation: "No test directories or test/spec files were detected.",
    });
  }

  private checkTestFramework(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "test-framework-configured",
      label: "Recognized test framework configured",
      pointsAvailable: TEST_FRAMEWORK_POINTS,
      detectionMethod:
        "Loaded manifest contents and tree paths for framework-specific evidence",
    };

    const hasCargoManifest =
      findLoadedManifest(facts, "Cargo.toml") !== undefined ||
      facts.rootEntries.some(
        (entry) => entry.type === "file" && entry.name === "Cargo.toml",
      );

    if (hasCargoManifest && !canEvaluateRustTestFramework(facts)) {
      return createUndeterminedCheck({
        ...base,
        explanation:
          "Rust source content was unavailable, so built-in Rust test configuration could not be verified.",
      });
    }

    if (hasRecognizedTestFramework(facts)) {
      return createPassedCheck({
        ...base,
        explanation: "A recognized test framework or test command configuration was detected.",
      });
    }

    return createFailedCheck({
      ...base,
      explanation: "No recognized test framework configuration was detected.",
    });
  }

  private recommendationForCheck(check: CheckResult): Recommendation[] {
    if (check.status === "passed" || check.status === "undetermined") {
      return [];
    }

    switch (check.id) {
      case "test-files-exist":
        return [
          {
            id: "testing-add-test-files",
            categoryId: CATEGORY_ID,
            title: "Add tests",
            description:
              "Add a tests/ or __tests__/ directory, or test/spec files, so the repository includes automated tests.",
            actionType: "manual-fix",
            potentialPoints: check.pointsAvailable,
          },
        ];
      case "test-framework-configured":
        return [
          {
            id: "testing-configure-framework",
            categoryId: CATEGORY_ID,
            title: "Configure a test framework",
            description:
              "Add a test script or recognized testing dependency for your project stack.",
            actionType: "manual-fix",
            potentialPoints: check.pointsAvailable,
          },
        ];
      default:
        return [];
    }
  }
}

export const testingHealthPlugin = new TestingHealthPlugin();
