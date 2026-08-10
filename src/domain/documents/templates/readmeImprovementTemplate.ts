import type { RepositoryFacts } from "../../models/repositoryFacts";
import {
  detectInstallCommand,
  detectTestCommand,
  getRepositoryDescription,
} from "../repository-fact-helpers";
import type { DocumentTemplate, TemplateRenderResult } from "../template-types";
import {
  formatCodeBlock,
  joinSections,
  TODO_TEST_COMMAND,
} from "../template-helpers";
import {
  DOCUMENT_DESCRIPTIONS,
  DOCUMENT_DESTINATION_PATHS,
  DOCUMENT_DISPLAY_NAMES,
} from "../../models/documentType";
import {
  hasDocumentationLink,
  hasSetupHeading,
  hasTestingGuidance,
  hasUsageHeading,
} from "../../health/readme-analysis";

const README_EXCERPT_LIMIT = 6_000;

export const readmeImprovementTemplate: DocumentTemplate = {
  documentType: "README_IMPROVEMENT",
  destinationPath: DOCUMENT_DESTINATION_PATHS.README_IMPROVEMENT,
  displayName: DOCUMENT_DISPLAY_NAMES.README_IMPROVEMENT,
  description: DOCUMENT_DESCRIPTIONS.README_IMPROVEMENT,
  render(facts: RepositoryFacts): TemplateRenderResult {
    return renderReadmeImprovement(facts, "README_IMPROVEMENT");
  },
};

export const readmeSetupTemplate: DocumentTemplate = {
  documentType: "README_SETUP",
  destinationPath: DOCUMENT_DESTINATION_PATHS.README_SETUP,
  displayName: DOCUMENT_DISPLAY_NAMES.README_SETUP,
  description: DOCUMENT_DESCRIPTIONS.README_SETUP,
  render(facts: RepositoryFacts): TemplateRenderResult {
    return renderReadmeImprovement(facts, "README_SETUP");
  },
};

export const readmeTestingTemplate: DocumentTemplate = {
  documentType: "README_TESTING",
  destinationPath: DOCUMENT_DESTINATION_PATHS.README_TESTING,
  displayName: DOCUMENT_DISPLAY_NAMES.README_TESTING,
  description: DOCUMENT_DESCRIPTIONS.README_TESTING,
  render(facts: RepositoryFacts): TemplateRenderResult {
    return renderReadmeImprovement(facts, "README_TESTING");
  },
};

function renderReadmeImprovement(
  facts: RepositoryFacts,
  mode: "README_IMPROVEMENT" | "README_SETUP" | "README_TESTING",
): TemplateRenderResult {
  const warnings: string[] = [];
  const existing = facts.readme.content?.trim() ?? "";
  const sections: string[] = [];

  if (existing.length > 0) {
    sections.push(
      "<!-- RepoReady: preserve useful existing README content below -->",
      truncateReadme(existing),
    );
  } else {
    sections.push(`# ${facts.name}`);
    const description = getRepositoryDescription(facts);

    if (description !== null) {
      sections.push(description);
    } else {
      sections.push("<!-- TODO: Add a concise project description -->");
      warnings.push("Repository description unavailable for README intro.");
    }
  }

  if (mode === "README_IMPROVEMENT" || mode === "README_SETUP") {
    sections.push(...buildSetupSection(facts, warnings, existing));
  }

  if (mode === "README_IMPROVEMENT") {
    sections.push(...buildUsageSection(facts, existing));
    sections.push(...buildDocumentationSection(existing));
  }

  if (mode === "README_IMPROVEMENT" || mode === "README_TESTING") {
    sections.push(...buildTestingSection(facts, warnings, existing));
  }

  return {
    markdown: joinSections(sections),
    warnings,
  };
}

function buildSetupSection(
  facts: RepositoryFacts,
  warnings: string[],
  existing: string,
): string[] {
  if (existing.length > 0 && hasSetupHeading(existing)) {
    return [
      "<!-- RepoReady: existing Setup/Installation section detected; review for completeness -->",
    ];
  }

  const installCommand = detectInstallCommand(facts);
  const sections = ["## Setup"];

  if (installCommand !== null) {
    sections.push("Install dependencies:", formatCodeBlock(installCommand));
  } else {
    sections.push("<!-- TODO: Add installation steps once the package manager is documented -->");
    warnings.push("Install command could not be determined.");
  }

  return sections;
}

function buildUsageSection(facts: RepositoryFacts, existing: string): string[] {
  if (existing.length > 0 && hasUsageHeading(existing)) {
    return [
      "<!-- RepoReady: existing Usage section detected; review for examples -->",
    ];
  }

  return [
    "## Usage",
    "<!-- TODO: Add concise usage examples for the current project -->",
    `Open the repository at \`${facts.owner}/${facts.name}\` and document the primary workflow contributors should follow.`,
  ];
}

function buildDocumentationSection(existing: string): string[] {
  if (existing.length > 0 && hasDocumentationLink(existing)) {
    return [];
  }

  return [
    "## Documentation",
    "- [Getting started](./docs/getting-started.md) <!-- TODO: verify path -->",
  ];
}

function buildTestingSection(
  facts: RepositoryFacts,
  warnings: string[],
  existing: string,
): string[] {
  if (existing.length > 0 && hasTestingGuidance(existing)) {
    return [
      "<!-- RepoReady: existing Testing section detected; review for accuracy -->",
    ];
  }

  const testCommand = detectTestCommand(facts);
  const sections = ["## Testing"];

  if (testCommand !== null) {
    sections.push("Run the test suite:", formatCodeBlock(testCommand));
  } else {
    sections.push(TODO_TEST_COMMAND);
    warnings.push("No deterministic test command was available.");
  }

  return sections;
}

function truncateReadme(content: string): string {
  if (content.length <= README_EXCERPT_LIMIT) {
    return content;
  }

  return `${content.slice(0, README_EXCERPT_LIMIT)}\n\n<!-- … existing README truncated for draft generation -->`;
}
