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

export const gettingStartedTemplate: DocumentTemplate = {
  documentType: "DOCUMENTATION",
  destinationPath: DOCUMENT_DESTINATION_PATHS.DOCUMENTATION,
  displayName: DOCUMENT_DISPLAY_NAMES.DOCUMENTATION,
  description: DOCUMENT_DESCRIPTIONS.DOCUMENTATION,
  render(facts: RepositoryFacts): TemplateRenderResult {
    const warnings: string[] = [];
    const description = getRepositoryDescription(facts);
    const installCommand = detectInstallCommand(facts);
    const testCommand = detectTestCommand(facts);

    const sections = [`# Getting Started`, `# ${facts.name}`];

    if (description !== null) {
      sections.push(description);
    } else {
      sections.push("<!-- TODO: Add a project overview -->");
      warnings.push("Repository description unavailable.");
    }

    sections.push("## Prerequisites", "<!-- TODO: Document runtime/tool prerequisites -->");

    sections.push("## Installation");

    if (installCommand !== null) {
      sections.push(formatCodeBlock(installCommand));
    } else {
      sections.push("<!-- TODO: Add verified installation steps -->");
      warnings.push("Install command could not be determined.");
    }

    sections.push("## Development");

    if (testCommand !== null) {
      sections.push("Run tests:", formatCodeBlock(testCommand));
    } else {
      sections.push(TODO_TEST_COMMAND);
      warnings.push("Test command could not be determined.");
    }

    sections.push(
      "## Project structure",
      "<!-- TODO: Summarize key directories once verified from the repository tree -->",
    );

    return {
      markdown: joinSections(sections),
      warnings,
    };
  },
};
