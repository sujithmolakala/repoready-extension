import {
  detectTestCommand,
  repositoryHasTests,
} from "../repository-fact-helpers";
import type { RepositoryFacts } from "../../models/repositoryFacts";
import type { DocumentTemplate, TemplateRenderResult } from "../template-types";
import { joinSections } from "../template-helpers";
import {
  DOCUMENT_DESCRIPTIONS,
  DOCUMENT_DESTINATION_PATHS,
  DOCUMENT_DISPLAY_NAMES,
} from "../../models/documentType";

export const pullRequestTemplate: DocumentTemplate = {
  documentType: "PULL_REQUEST_TEMPLATE",
  destinationPath: DOCUMENT_DESTINATION_PATHS.PULL_REQUEST_TEMPLATE,
  displayName: DOCUMENT_DISPLAY_NAMES.PULL_REQUEST_TEMPLATE,
  description: DOCUMENT_DESCRIPTIONS.PULL_REQUEST_TEMPLATE,
  render(facts: RepositoryFacts): TemplateRenderResult {
    const warnings: string[] = [];
    const testCommand = detectTestCommand(facts);
    const hasTests = repositoryHasTests(facts);

    const testingSection =
      testCommand !== null
        ? [
            "## Testing",
            "Describe the tests you ran and their results.",
            "",
            "Suggested command:",
            "```bash",
            testCommand,
            "```",
          ].join("\n")
        : [
            "## Testing",
            "Describe the tests you ran and their results.",
            hasTests
              ? "<!-- TODO: Add the command used to run tests -->"
              : "If this repository has automated tests, describe how you verified the change.",
          ].join("\n\n");

    if (testingSection.includes("<!-- TODO:")) {
      warnings.push("No deterministic test command was available for the PR template.");
    }

    const markdown = joinSections([
      "## Summary",
      "Briefly describe the purpose of this pull request.",
      "## Changes",
      "- ",
      testingSection,
      [
        "## Checklist",
        "- [ ] I reviewed my changes",
        "- [ ] I added or updated tests where appropriate",
        "- [ ] I updated documentation where appropriate",
      ].join("\n"),
    ]);

    return { markdown, warnings };
  },
};
