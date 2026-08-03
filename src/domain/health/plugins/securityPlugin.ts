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
  hasRepositoryFileInLocations,
} from "../plugin-utils";

const CATEGORY_ID = "security";
const CATEGORY_LABEL = "Security";

const SECURITY_POLICY_POINTS = 5;
const DEPENDABOT_POINTS = 5;

const ROOT_AND_GITHUB_LOCATIONS = ["", ".github"] as const;

const SECURITY_FILE_NAMES = [
  "SECURITY.md",
  "SECURITY",
  "SECURITY.rst",
] as const;

const DEPENDABOT_FILE_NAMES = ["dependabot.yml", "dependabot.yaml"] as const;

export class SecurityHealthPlugin implements HealthPlugin {
  readonly id = CATEGORY_ID;
  readonly categoryLabel = CATEGORY_LABEL;
  readonly maxPoints = 10;

  analyze(facts: RepositoryFacts) {
    const checks: CheckResult[] = [
      this.checkSecurityPolicy(facts),
      this.checkDependabot(facts),
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

  private checkSecurityPolicy(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "security-policy-exists",
      label: "SECURITY policy exists",
      pointsAvailable: SECURITY_POLICY_POINTS,
      detectionMethod: "Root and .github SECURITY filename match",
    };

    if (
      hasRepositoryFileInLocations(
        facts,
        SECURITY_FILE_NAMES,
        ROOT_AND_GITHUB_LOCATIONS,
      )
    ) {
      return createPassedCheck({
        ...base,
        explanation: "A SECURITY policy file was detected.",
      });
    }

    return createFailedCheck({
      ...base,
      explanation: "No SECURITY policy file was detected in the root or .github directory.",
    });
  }

  private checkDependabot(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "dependabot-config-exists",
      label: "Dependabot config exists",
      pointsAvailable: DEPENDABOT_POINTS,
      detectionMethod: ".github/dependabot.yml or .github/dependabot.yaml",
    };

    if (hasRepositoryFileInLocations(facts, DEPENDABOT_FILE_NAMES, [".github"])) {
      return createPassedCheck({
        ...base,
        explanation: "A Dependabot configuration file was detected under .github.",
      });
    }

    const hasDependabotPath = facts.tree.paths.some((path) => {
      const normalizedPath = path.toLowerCase();

      return (
        normalizedPath === ".github/dependabot.yml" ||
        normalizedPath === ".github/dependabot.yaml"
      );
    });

    if (hasDependabotPath) {
      return createPassedCheck({
        ...base,
        explanation: "A Dependabot configuration file was detected under .github.",
      });
    }

    if (facts.tree.skipped && facts.githubEntries.length === 0) {
      return createUndeterminedCheck({
        ...base,
        explanation:
          "Tree and .github entries were unavailable, so Dependabot configuration could not be verified.",
      });
    }

    return createFailedCheck({
      ...base,
      explanation: "No Dependabot configuration file was detected under .github.",
    });
  }

  private recommendationForCheck(check: CheckResult): Recommendation[] {
    if (check.status === "passed" || check.status === "undetermined") {
      return [];
    }

    switch (check.id) {
      case "security-policy-exists":
        return [
          {
            id: "security-add-security-policy",
            categoryId: CATEGORY_ID,
            title: "Add a security policy",
            description:
              "Publish SECURITY.md with instructions for reporting vulnerabilities.",
            actionType: "generate-document",
            relatedDocumentType: "security-policy",
            potentialPoints: check.pointsAvailable,
          },
        ];
      case "dependabot-config-exists":
        return [
          {
            id: "security-add-dependabot",
            categoryId: CATEGORY_ID,
            title: "Add Dependabot configuration",
            description:
              "Add .github/dependabot.yml so dependency updates are monitored automatically.",
            actionType: "manual-fix",
            potentialPoints: check.pointsAvailable,
          },
        ];
      default:
        return [];
    }
  }
}

export const securityHealthPlugin = new SecurityHealthPlugin();
