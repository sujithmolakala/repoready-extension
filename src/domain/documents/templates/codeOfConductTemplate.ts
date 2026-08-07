import type { RepositoryFacts } from "../../models/repositoryFacts";
import type { DocumentTemplate, TemplateRenderResult } from "../template-types";
import {
  TODO_CONDUCT_CONTACT,
  collectTodoWarnings,
  joinSections,
} from "../template-helpers";
import {
  DOCUMENT_DESCRIPTIONS,
  DOCUMENT_DESTINATION_PATHS,
  DOCUMENT_DISPLAY_NAMES,
} from "../../models/documentType";

export const codeOfConductTemplate: DocumentTemplate = {
  documentType: "CODE_OF_CONDUCT",
  destinationPath: DOCUMENT_DESTINATION_PATHS.CODE_OF_CONDUCT,
  displayName: DOCUMENT_DISPLAY_NAMES.CODE_OF_CONDUCT,
  description: DOCUMENT_DESCRIPTIONS.CODE_OF_CONDUCT,
  render(facts: RepositoryFacts): TemplateRenderResult {
    const warnings: string[] = [];

    const markdown = joinSections([
      `# Code of Conduct for ${facts.name}`,
      [
        "## Our Commitment",
        "We are committed to providing a welcoming, respectful, and harassment-free experience for everyone who participates in this project.",
      ].join("\n\n"),
      [
        "## Expected Behavior",
        "- Be respectful and considerate in discussions and reviews.",
        "- Give constructive feedback and assume good intent.",
        "- Focus on what is best for the community and the project.",
      ].join("\n\n"),
      [
        "## Unacceptable Behavior",
        "The following behaviors are not tolerated:",
        "- Harassment, discrimination, or personal attacks.",
        "- Publishing private information without permission.",
        "- Sustained disruption of discussions or project work.",
        "- Other conduct that would be inappropriate in a professional setting.",
      ].join("\n\n"),
      [
        "## Reporting Concerns",
        "If you experience or witness unacceptable behavior, report it through a private channel maintained by the project maintainers.",
        TODO_CONDUCT_CONTACT,
      ].join("\n\n"),
      [
        "## Enforcement",
        "Project maintainers may review reports and take action they deem appropriate, including warnings or removal from project spaces.",
      ].join("\n\n"),
    ]);

    warnings.push(...collectTodoWarnings(markdown));

    if (markdown.includes(TODO_CONDUCT_CONTACT)) {
      warnings.push("No private conduct reporting contact was available.");
    }

    return { markdown, warnings };
  },
};
