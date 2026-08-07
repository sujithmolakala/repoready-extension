import type { RepositoryFacts } from "../../models/repositoryFacts";
import type { DocumentTemplate, TemplateRenderResult } from "../template-types";
import {
  TODO_SECURITY_CONTACT,
  TODO_SUPPORTED_VERSIONS,
  collectTodoWarnings,
  joinSections,
} from "../template-helpers";
import {
  DOCUMENT_DESCRIPTIONS,
  DOCUMENT_DESTINATION_PATHS,
  DOCUMENT_DISPLAY_NAMES,
} from "../../models/documentType";

export const securityTemplate: DocumentTemplate = {
  documentType: "SECURITY",
  destinationPath: DOCUMENT_DESTINATION_PATHS.SECURITY,
  displayName: DOCUMENT_DISPLAY_NAMES.SECURITY,
  description: DOCUMENT_DESCRIPTIONS.SECURITY,
  render(facts: RepositoryFacts): TemplateRenderResult {
    const warnings: string[] = [];

    const markdown = joinSections([
      `# Security Policy`,
      [
        "## Reporting a Vulnerability",
        `If you believe you have found a security vulnerability in ${facts.name}, please report it through a private channel rather than opening a public GitHub issue.`,
        "Publicly disclosing vulnerabilities before they are addressed can put users at risk.",
        TODO_SECURITY_CONTACT,
      ].join("\n\n"),
      [
        "## Supported Versions",
        TODO_SUPPORTED_VERSIONS,
      ].join("\n\n"),
      [
        "## What to Include in a Report",
        "Helpful reports usually include:",
        "- The affected component or area of the project.",
        "- Steps to reproduce the issue.",
        "- The potential impact.",
        "- Any mitigation or workaround you have identified.",
      ].join("\n\n"),
    ]);

    warnings.push(...collectTodoWarnings(markdown));

    if (markdown.includes(TODO_SECURITY_CONTACT)) {
      warnings.push("No private security reporting contact was available.");
    }

    if (markdown.includes(TODO_SUPPORTED_VERSIONS)) {
      warnings.push("Supported versions could not be determined from repository facts.");
    }

    return { markdown, warnings };
  },
};
