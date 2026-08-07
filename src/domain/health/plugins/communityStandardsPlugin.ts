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
  hasRepositoryDirectoryInLocations,
  hasRepositoryFileInLocations,
} from "../plugin-utils";

const CATEGORY_ID = "community-standards";
const CATEGORY_LABEL = "Community Standards";

const CONTRIBUTING_POINTS = 5;
const CODE_OF_CONDUCT_POINTS = 4;
const SECURITY_POLICY_POINTS = 4;
const ISSUE_TEMPLATE_POINTS = 4;
const PULL_REQUEST_TEMPLATE_POINTS = 3;

const ROOT_AND_GITHUB_LOCATIONS = ["", ".github"] as const;

const CONTRIBUTING_FILE_NAMES = [
  "CONTRIBUTING.md",
  "CONTRIBUTING",
  "CONTRIBUTING.rst",
] as const;

const CODE_OF_CONDUCT_FILE_NAMES = [
  "CODE_OF_CONDUCT.md",
  "CODE_OF_CONDUCT",
  "CODE_OF_CONDUCT.rst",
] as const;

const SECURITY_FILE_NAMES = [
  "SECURITY.md",
  "SECURITY",
  "SECURITY.rst",
] as const;

const ISSUE_TEMPLATE_FILE_NAMES = [
  "ISSUE_TEMPLATE.md",
  "ISSUE_TEMPLATE.yml",
  "ISSUE_TEMPLATE.yaml",
] as const;

const ISSUE_TEMPLATE_DIRECTORY = ".github/ISSUE_TEMPLATE";

const PULL_REQUEST_TEMPLATE_PATHS = [
  { fileNames: ["PULL_REQUEST_TEMPLATE.md"], locations: [".github"] },
  { fileNames: ["PULL_REQUEST_TEMPLATE.md"], locations: [""] },
  { fileNames: ["PULL_REQUEST_TEMPLATE.md"], locations: ["docs"] },
] as const;

export class CommunityStandardsHealthPlugin implements HealthPlugin {
  readonly id = CATEGORY_ID;
  readonly categoryLabel = CATEGORY_LABEL;
  readonly maxPoints = 20;

  analyze(facts: RepositoryFacts) {
    const checks: CheckResult[] = [
      this.checkContributing(facts),
      this.checkCodeOfConduct(facts),
      this.checkSecurityPolicy(facts),
      this.checkIssueTemplates(facts),
      this.checkPullRequestTemplate(facts),
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

  private checkContributing(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "contributing-guidelines",
      label: "CONTRIBUTING exists",
      pointsAvailable: CONTRIBUTING_POINTS,
      detectionMethod: "Root and .github contributing filename match",
    };

    if (
      hasRepositoryFileInLocations(
        facts,
        CONTRIBUTING_FILE_NAMES,
        ROOT_AND_GITHUB_LOCATIONS,
      )
    ) {
      return createPassedCheck({
        ...base,
        explanation: "Contributing guidelines were detected.",
      });
    }

    return createFailedCheck({
      ...base,
      explanation: "No CONTRIBUTING file was detected in the root or .github directory.",
    });
  }

  private checkCodeOfConduct(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "code-of-conduct",
      label: "CODE_OF_CONDUCT exists",
      pointsAvailable: CODE_OF_CONDUCT_POINTS,
      detectionMethod: "Root and .github code of conduct filename match",
    };

    if (
      hasRepositoryFileInLocations(
        facts,
        CODE_OF_CONDUCT_FILE_NAMES,
        ROOT_AND_GITHUB_LOCATIONS,
      )
    ) {
      return createPassedCheck({
        ...base,
        explanation: "A code of conduct file was detected.",
      });
    }

    return createFailedCheck({
      ...base,
      explanation: "No CODE_OF_CONDUCT file was detected in the root or .github directory.",
    });
  }

  private checkSecurityPolicy(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "security-policy",
      label: "SECURITY policy exists",
      pointsAvailable: SECURITY_POLICY_POINTS,
      detectionMethod: "Root and .github security filename match",
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
        explanation: "A security policy file was detected.",
      });
    }

    return createFailedCheck({
      ...base,
      explanation: "No SECURITY file was detected in the root or .github directory.",
    });
  }

  private checkIssueTemplates(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "issue-templates",
      label: "Issue templates exist",
      pointsAvailable: ISSUE_TEMPLATE_POINTS,
      detectionMethod: ".github/ISSUE_TEMPLATE directory or template file",
    };

    if (
      hasRepositoryDirectoryInLocations(facts, [ISSUE_TEMPLATE_DIRECTORY]) ||
      hasRepositoryFileInLocations(
        facts,
        ISSUE_TEMPLATE_FILE_NAMES,
        [".github"],
      )
    ) {
      return createPassedCheck({
        ...base,
        explanation: "Issue templates were detected under .github.",
      });
    }

    return createFailedCheck({
      ...base,
      explanation: "No issue templates were detected under .github.",
    });
  }

  private checkPullRequestTemplate(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "pull-request-template",
      label: "Pull request template exists",
      pointsAvailable: PULL_REQUEST_TEMPLATE_POINTS,
      detectionMethod:
        "Root, .github, or docs pull request template file or directory",
    };

    if (
      hasRepositoryDirectoryInLocations(facts, [".github/PULL_REQUEST_TEMPLATE"]) ||
      PULL_REQUEST_TEMPLATE_PATHS.some(({ fileNames, locations }) =>
        hasRepositoryFileInLocations(facts, fileNames, locations),
      )
    ) {
      return createPassedCheck({
        ...base,
        explanation: "A pull request template was detected.",
      });
    }

    return createFailedCheck({
      ...base,
      explanation: "No pull request template was detected.",
    });
  }

  private recommendationForCheck(check: CheckResult): Recommendation[] {
    if (check.status === "passed") {
      return [];
    }

    switch (check.id) {
      case "contributing-guidelines":
        return [
          {
            id: "community-add-contributing",
            categoryId: CATEGORY_ID,
            title: "Add contributing guidelines",
            description:
              "Add CONTRIBUTING.md with guidance for bug reports, pull requests, and development setup.",
            actionType: "generate-document",
            relatedDocumentType: "contributing",
            potentialPoints: check.pointsAvailable,
          },
        ];
      case "code-of-conduct":
        return [
          {
            id: "community-add-code-of-conduct",
            categoryId: CATEGORY_ID,
            title: "Add a code of conduct",
            description:
              "Publish a CODE_OF_CONDUCT file to define community expectations.",
            actionType: "generate-document",
            relatedDocumentType: "code-of-conduct",
            potentialPoints: check.pointsAvailable,
          },
        ];
      case "security-policy":
        return [
          {
            id: "community-add-security-policy",
            categoryId: CATEGORY_ID,
            title: "Add a security policy",
            description:
              "Publish SECURITY.md with instructions for reporting vulnerabilities.",
            actionType: "generate-document",
            relatedDocumentType: "security-policy",
            potentialPoints: check.pointsAvailable,
          },
        ];
      case "issue-templates":
        return [
          {
            id: "community-add-issue-templates",
            categoryId: CATEGORY_ID,
            title: "Add issue templates",
            description:
              "Create .github/ISSUE_TEMPLATE files so new issues include useful context.",
            actionType: "generate-document",
            relatedDocumentType: "issue-template",
            potentialPoints: check.pointsAvailable,
          },
        ];
      case "pull-request-template":
        return [
          {
            id: "community-add-pull-request-template",
            categoryId: CATEGORY_ID,
            title: "Add a pull request template",
            description:
              "Add a PULL_REQUEST_TEMPLATE file in the root, .github, or docs directory.",
            actionType: "generate-document",
            relatedDocumentType: "pull-request-template",
            potentialPoints: check.pointsAvailable,
          },
        ];
      default:
        return [];
    }
  }
}

export const communityStandardsHealthPlugin = new CommunityStandardsHealthPlugin();
