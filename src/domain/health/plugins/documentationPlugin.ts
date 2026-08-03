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
  hasNonEmptyText,
  hasRepositoryFileInLocations,
  hasRootDirectory,
} from "../plugin-utils";
import {
  hasDocumentationLink,
  hasSetupHeading,
  hasTestingGuidance,
  hasUsageHeading,
} from "../readme-analysis";

const CATEGORY_ID = "documentation";
const CATEGORY_LABEL = "Documentation";

const README_EXISTS_POINTS = 5;
const README_SETUP_POINTS = 4;
const README_USAGE_POINTS = 4;
const README_TESTING_POINTS = 3;
const DESCRIPTION_POINTS = 3;
const CHANGELOG_POINTS = 3;
const DOCS_DIRECTORY_OR_LINK_POINTS = 3;

const CHANGELOG_FILE_NAMES = [
  "CHANGELOG.md",
  "CHANGELOG",
  "CHANGES.md",
  "HISTORY.md",
] as const;

const README_SECTION_CHECK_IDS = [
  "readme-setup",
  "readme-usage",
  "readme-testing",
  "docs-directory-or-link",
] as const;

export class DocumentationHealthPlugin implements HealthPlugin {
  readonly id = CATEGORY_ID;
  readonly categoryLabel = CATEGORY_LABEL;
  readonly maxPoints = 25;

  analyze(facts: RepositoryFacts) {
    const checks: CheckResult[] = [
      this.checkReadmeExists(facts),
      this.checkReadmeSetup(facts),
      this.checkReadmeUsage(facts),
      this.checkReadmeTesting(facts),
      this.checkDescription(facts),
      this.checkChangelog(facts),
      this.checkDocsDirectoryOrLink(facts),
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

  private checkReadmeExists(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "readme-present",
      label: "README exists",
      pointsAvailable: README_EXISTS_POINTS,
      detectionMethod: "RepositoryFacts.readme.exists",
    };

    if (facts.readme.exists) {
      return createPassedCheck({
        ...base,
        explanation: facts.readme.path
          ? `Found README at ${facts.readme.path}.`
          : "A README file is present in the repository root.",
      });
    }

    return createFailedCheck({
      ...base,
      explanation: "No README file was detected in the repository root.",
    });
  }

  private checkReadmeSetup(facts: RepositoryFacts): CheckResult {
    return this.evaluateReadmeSection(facts, {
      id: "readme-setup",
      label: "README has installation/setup guidance",
      pointsAvailable: README_SETUP_POINTS,
      detectionMethod: "Markdown heading match for installation/setup sections",
      passedExplanation:
        "README includes a setup or installation heading such as Setup or Getting Started.",
      failedExplanation:
        "README does not include a recognized setup or installation heading.",
      undeterminedExplanation:
        "README exists, but its content was unavailable or exceeded storage limits.",
      evaluateContent: hasSetupHeading,
    });
  }

  private checkReadmeUsage(facts: RepositoryFacts): CheckResult {
    return this.evaluateReadmeSection(facts, {
      id: "readme-usage",
      label: "README has usage/examples",
      pointsAvailable: README_USAGE_POINTS,
      detectionMethod: "Markdown heading match for usage/examples sections",
      passedExplanation:
        "README includes a usage or examples heading such as Usage or Examples.",
      failedExplanation:
        "README does not include a recognized usage or examples heading.",
      undeterminedExplanation:
        "README exists, but its content was unavailable or exceeded storage limits.",
      evaluateContent: hasUsageHeading,
    });
  }

  private checkReadmeTesting(facts: RepositoryFacts): CheckResult {
    return this.evaluateReadmeSection(facts, {
      id: "readme-testing",
      label: "README explains testing",
      pointsAvailable: README_TESTING_POINTS,
      detectionMethod:
        "Markdown heading match for testing or fenced code block test command",
      passedExplanation:
        "README documents testing through a testing heading or recognized test command.",
      failedExplanation:
        "README does not document testing with a recognized heading or test command.",
      undeterminedExplanation:
        "README exists, but its content was unavailable or exceeded storage limits.",
      evaluateContent: hasTestingGuidance,
    });
  }

  private checkDescription(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "repository-description",
      label: "Repository description exists",
      pointsAvailable: DESCRIPTION_POINTS,
      detectionMethod: "RepositoryFacts.description",
    };

    if (hasNonEmptyText(facts.description)) {
      return createPassedCheck({
        ...base,
        explanation: "GitHub repository metadata includes a description.",
      });
    }

    return createFailedCheck({
      ...base,
      explanation: "GitHub repository metadata is missing a description.",
    });
  }

  private checkChangelog(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "changelog-present",
      label: "Changelog exists",
      pointsAvailable: CHANGELOG_POINTS,
      detectionMethod: "Root changelog filename match",
    };

    if (hasRepositoryFileInLocations(facts, CHANGELOG_FILE_NAMES, [""])) {
      return createPassedCheck({
        ...base,
        explanation: "A recognized changelog file exists in the repository root.",
      });
    }

    return createFailedCheck({
      ...base,
      explanation: "No recognized changelog file was detected in the repository root.",
    });
  }

  private checkDocsDirectoryOrLink(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "docs-directory-or-link",
      label: "Documentation directory or docs link exists",
      pointsAvailable: DOCS_DIRECTORY_OR_LINK_POINTS,
      detectionMethod: "Root docs directory or README documentation link",
    };

    if (hasRootDirectory(facts.rootEntries, "docs")) {
      return createPassedCheck({
        ...base,
        explanation: "A docs directory exists in the repository root.",
      });
    }

    if (!facts.readme.exists) {
      return createFailedCheck({
        ...base,
        explanation:
          "No docs directory was found and README content is unavailable for link detection.",
      });
    }

    if (facts.readme.content === null) {
      return createUndeterminedCheck({
        ...base,
        explanation:
          "README exists, but its content was unavailable or exceeded storage limits.",
      });
    }

    if (hasDocumentationLink(facts.readme.content)) {
      return createPassedCheck({
        ...base,
        explanation: "README contains a Markdown link that points to documentation.",
      });
    }

    return createFailedCheck({
      ...base,
      explanation:
        "No docs directory or recognized documentation link was detected.",
    });
  }

  private evaluateReadmeSection(
    facts: RepositoryFacts,
    config: {
      id: string;
      label: string;
      pointsAvailable: number;
      detectionMethod: string;
      passedExplanation: string;
      failedExplanation: string;
      undeterminedExplanation: string;
      evaluateContent: (content: string) => boolean;
    },
  ): CheckResult {
    const base = {
      id: config.id,
      label: config.label,
      pointsAvailable: config.pointsAvailable,
      detectionMethod: config.detectionMethod,
    };

    if (!facts.readme.exists) {
      return createFailedCheck({
        ...base,
        explanation: config.failedExplanation,
      });
    }

    if (facts.readme.content === null) {
      return createUndeterminedCheck({
        ...base,
        explanation: config.undeterminedExplanation,
      });
    }

    if (config.evaluateContent(facts.readme.content)) {
      return createPassedCheck({
        ...base,
        explanation: config.passedExplanation,
      });
    }

    return createFailedCheck({
      ...base,
      explanation: config.failedExplanation,
    });
  }

  private recommendationForCheck(check: CheckResult): Recommendation[] {
    if (check.status === "passed" || check.status === "undetermined") {
      return [];
    }

    switch (check.id) {
      case "readme-present":
        return [
          {
            id: "documentation-add-readme",
            categoryId: CATEGORY_ID,
            title: "Add a README",
            description:
              "Create a README file in the repository root so visitors understand the project.",
            actionType: "generate-document",
            relatedDocumentType: "readme",
            potentialPoints: check.pointsAvailable,
          },
        ];
      case "readme-setup":
        return [
          {
            id: "documentation-add-setup-section",
            categoryId: CATEGORY_ID,
            title: "Add setup instructions to the README",
            description:
              "Add a Setup, Installation, or Getting Started section with install steps.",
            actionType: "generate-document",
            relatedDocumentType: "readme",
            potentialPoints: check.pointsAvailable,
          },
        ];
      case "readme-usage":
        return [
          {
            id: "documentation-add-usage-section",
            categoryId: CATEGORY_ID,
            title: "Add usage examples to the README",
            description:
              "Add a Usage or Examples section that shows how to use the project.",
            actionType: "generate-document",
            relatedDocumentType: "readme",
            potentialPoints: check.pointsAvailable,
          },
        ];
      case "readme-testing":
        return [
          {
            id: "documentation-add-testing-section",
            categoryId: CATEGORY_ID,
            title: "Document testing in the README",
            description:
              "Add a Testing section or include a recognized test command in a code block.",
            actionType: "generate-document",
            relatedDocumentType: "readme",
            potentialPoints: check.pointsAvailable,
          },
        ];
      case "repository-description":
        return [
          {
            id: "documentation-add-description",
            categoryId: CATEGORY_ID,
            title: "Add a repository description",
            description:
              "Set a short GitHub repository description that explains what the project does.",
            actionType: "manual-fix",
            potentialPoints: check.pointsAvailable,
          },
        ];
      case "changelog-present":
        return [
          {
            id: "documentation-add-changelog",
            categoryId: CATEGORY_ID,
            title: "Add a changelog",
            description:
              "Add CHANGELOG.md or another recognized changelog file in the repository root.",
            actionType: "generate-document",
            relatedDocumentType: "changelog",
            potentialPoints: check.pointsAvailable,
          },
        ];
      case "docs-directory-or-link":
        return [
          {
            id: "documentation-add-docs-link",
            categoryId: CATEGORY_ID,
            title: "Add project documentation",
            description:
              "Create a docs directory or link to documentation from the README.",
            actionType: "generate-document",
            relatedDocumentType: "documentation",
            potentialPoints: check.pointsAvailable,
          },
        ];
      default:
        return [];
    }
  }
}

export const documentationHealthPlugin = new DocumentationHealthPlugin();

export { README_SECTION_CHECK_IDS };
