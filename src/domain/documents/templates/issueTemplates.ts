import type { RepositoryFacts } from "../../models/repositoryFacts";
import type { DocumentTemplate, TemplateRenderResult } from "../template-types";
import { joinSections } from "../template-helpers";
import {
  DOCUMENT_DESCRIPTIONS,
  DOCUMENT_DESTINATION_PATHS,
  DOCUMENT_DISPLAY_NAMES,
} from "../../models/documentType";

export const issueTemplateBug: DocumentTemplate = {
  documentType: "ISSUE_TEMPLATE_BUG",
  destinationPath: DOCUMENT_DESTINATION_PATHS.ISSUE_TEMPLATE_BUG,
  displayName: DOCUMENT_DISPLAY_NAMES.ISSUE_TEMPLATE_BUG,
  description: DOCUMENT_DESCRIPTIONS.ISSUE_TEMPLATE_BUG,
  render(facts: RepositoryFacts): TemplateRenderResult {
    const markdown = joinSections([
      [
        "---",
        "name: Bug report",
        `about: Report a reproducible problem in ${facts.name}`,
        'title: ""',
        'labels: ""',
        'assignees: ""',
        "---",
      ].join("\n"),
      "## Description",
      "Describe the problem clearly and concisely.",
      "## Steps to Reproduce",
      "1. ",
      "2. ",
      "3. ",
      "## Expected Behavior",
      "Describe what you expected to happen.",
      "## Actual Behavior",
      "Describe what actually happened.",
      "## Environment",
      "- OS:",
      "- Browser or runtime:",
      "- Project version or commit:",
      "## Additional Context",
      "Add screenshots, logs, or other details that may help.",
    ]);

    return { markdown, warnings: [] };
  },
};

export const issueTemplateFeature: DocumentTemplate = {
  documentType: "ISSUE_TEMPLATE_FEATURE",
  destinationPath: DOCUMENT_DESTINATION_PATHS.ISSUE_TEMPLATE_FEATURE,
  displayName: DOCUMENT_DISPLAY_NAMES.ISSUE_TEMPLATE_FEATURE,
  description: DOCUMENT_DESCRIPTIONS.ISSUE_TEMPLATE_FEATURE,
  render(facts: RepositoryFacts): TemplateRenderResult {
    const markdown = joinSections([
      [
        "---",
        "name: Feature request",
        `about: Suggest an improvement to ${facts.name}`,
        'title: ""',
        'labels: ""',
        'assignees: ""',
        "---",
      ].join("\n"),
      "## Problem",
      "Describe the problem or limitation you want to address.",
      "## Proposed Solution",
      "Describe the solution you would like to see.",
      "## Alternatives Considered",
      "Describe any alternative approaches you considered.",
      "## Additional Context",
      "Add mockups, examples, or other supporting details.",
    ]);

    return { markdown, warnings: [] };
  },
};
