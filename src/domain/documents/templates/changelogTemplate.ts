import type { RepositoryFacts } from "../../models/repositoryFacts";
import type { DocumentTemplate, TemplateRenderResult } from "../template-types";
import { joinSections } from "../template-helpers";
import {
  DOCUMENT_DESCRIPTIONS,
  DOCUMENT_DESTINATION_PATHS,
  DOCUMENT_DISPLAY_NAMES,
} from "../../models/documentType";

export const changelogTemplate: DocumentTemplate = {
  documentType: "CHANGELOG",
  destinationPath: DOCUMENT_DESTINATION_PATHS.CHANGELOG,
  displayName: DOCUMENT_DISPLAY_NAMES.CHANGELOG,
  description: DOCUMENT_DESCRIPTIONS.CHANGELOG,
  render(facts: RepositoryFacts): TemplateRenderResult {
    const markdown = joinSections([
      `# Changelog`,
      `All notable changes to ${facts.name} should be documented in this file.`,
      [
        "## Unreleased",
        "### Added",
        "- Initial changelog scaffold.",
      ].join("\n\n"),
    ]);

    return { markdown, warnings: [] };
  },
};
