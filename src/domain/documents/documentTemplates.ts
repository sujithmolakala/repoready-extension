import type { DocumentType } from "../models/documentType";
import type { DocumentTemplate } from "./template-types";
import { changelogTemplate } from "./templates/changelogTemplate";
import { codeOfConductTemplate } from "./templates/codeOfConductTemplate";
import { contributingTemplate } from "./templates/contributingTemplate";
import { gettingStartedTemplate } from "./templates/gettingStartedTemplate";
import { issueTemplateBug, issueTemplateFeature } from "./templates/issueTemplates";
import { pullRequestTemplate } from "./templates/pullRequestTemplate";
import {
  readmeImprovementTemplate,
  readmeSetupTemplate,
  readmeTestingTemplate,
} from "./templates/readmeImprovementTemplate";
import { securityTemplate } from "./templates/securityTemplate";

export const documentTemplates: readonly DocumentTemplate[] = [
  contributingTemplate,
  codeOfConductTemplate,
  securityTemplate,
  changelogTemplate,
  issueTemplateBug,
  issueTemplateFeature,
  pullRequestTemplate,
  readmeImprovementTemplate,
  readmeSetupTemplate,
  readmeTestingTemplate,
  gettingStartedTemplate,
];

const templatesByType = new Map<DocumentType, DocumentTemplate>(
  documentTemplates.map((template) => [template.documentType, template]),
);

export function getDocumentTemplate(
  documentType: DocumentType,
): DocumentTemplate {
  const template = templatesByType.get(documentType);

  if (template === undefined) {
    throw new Error(`No template registered for document type: ${documentType}`);
  }

  return template;
}

export function renderDocumentTemplate(
  documentType: DocumentType,
  facts: import("../models/repositoryFacts").RepositoryFacts,
) {
  return getDocumentTemplate(documentType).render(facts);
}
