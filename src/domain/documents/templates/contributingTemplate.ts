import type { RepositoryFacts } from "../../models/repositoryFacts";
import {
  detectInstallCommand,
  detectTestCommand,
  getRepositoryDescription,
} from "../repository-fact-helpers";
import type { DocumentTemplate, TemplateRenderResult } from "../template-types";
import {
  TODO_TEST_COMMAND,
  collectTodoWarnings,
  formatCodeBlock,
  joinSections,
} from "../template-helpers";
import {
  DOCUMENT_DESCRIPTIONS,
  DOCUMENT_DESTINATION_PATHS,
  DOCUMENT_DISPLAY_NAMES,
} from "../../models/documentType";

export const contributingTemplate: DocumentTemplate = {
  documentType: "CONTRIBUTING",
  destinationPath: DOCUMENT_DESTINATION_PATHS.CONTRIBUTING,
  displayName: DOCUMENT_DISPLAY_NAMES.CONTRIBUTING,
  description: DOCUMENT_DESCRIPTIONS.CONTRIBUTING,
  render(facts: RepositoryFacts): TemplateRenderResult {
    const warnings: string[] = [];
    const installCommand = detectInstallCommand(facts);
    const testCommand = detectTestCommand(facts);
    const description = getRepositoryDescription(facts);

    const gettingStartedSections = ["## Getting Started"];

    if (description !== null) {
      gettingStartedSections.push(description);
    }

    if (installCommand !== null) {
      gettingStartedSections.push(
        "Install project dependencies:",
        formatCodeBlock(installCommand),
      );
    } else if (facts.dependencyFiles.some((file) => file.name === "package.json")) {
      gettingStartedSections.push(
        "<!-- TODO: Add installation steps once the package manager is documented -->",
      );
      warnings.push("Package manager could not be determined for install steps.");
    }

    const runningTestsSections = ["## Running Tests"];

    if (testCommand !== null) {
      runningTestsSections.push(
        "Run the project test suite:",
        formatCodeBlock(testCommand),
      );
    } else {
      runningTestsSections.push(TODO_TEST_COMMAND);
      warnings.push("No deterministic test command was available.");
    }

    const markdown = joinSections([
      `# Contributing to ${facts.name}`,
      gettingStartedSections.join("\n\n"),
      runningTestsSections.join("\n\n"),
      [
        "## Submitting Changes",
        "Thank you for considering a contribution. When preparing a change:",
        "- Keep the scope focused on one improvement or fix.",
        "- Run the relevant tests before opening a pull request.",
        "- Explain what changed and why in the pull request description.",
        "- Open a pull request against the default branch when your change is ready.",
      ].join("\n\n"),
      [
        "## Reporting Issues",
        "Use GitHub Issues to report bugs or ask questions.",
        "Include clear steps to reproduce problems and any relevant environment details.",
      ].join("\n\n"),
    ]);

    warnings.push(...collectTodoWarnings(markdown));

    return { markdown, warnings };
  },
};
