import type { DocumentType } from "../models/documentType";
import type { RepositoryFacts } from "../models/repositoryFacts";

export interface TemplateRenderResult {
  markdown: string;
  warnings: string[];
}

export interface DocumentTemplate {
  documentType: DocumentType;
  destinationPath: string;
  displayName: string;
  description: string;
  render(facts: RepositoryFacts): TemplateRenderResult;
}
