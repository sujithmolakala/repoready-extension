import { renderDocumentTemplate } from "../domain/documents/documentTemplates";
import { getDocumentDestinationPath } from "../domain/models/documentType";
import type { DocumentType } from "../domain/models/documentType";
import type { DraftDocument } from "../domain/models/draftDocument";
import type { RepositoryFacts } from "../domain/models/repositoryFacts";

export interface GenerateDocumentInput {
  owner: string;
  repo: string;
  documentType: DocumentType;
  facts: RepositoryFacts;
  generatedAt?: string;
}

export class GenerateDocumentUseCase {
  execute(input: GenerateDocumentInput): DraftDocument {
    const generatedAt = input.generatedAt ?? new Date().toISOString();
    const renderResult = renderDocumentTemplate(input.documentType, input.facts);

    return {
      id: `${input.owner}/${input.repo}/${input.documentType}`,
      owner: input.owner,
      repo: input.repo,
      documentType: input.documentType,
      destinationPath: getDocumentDestinationPath(input.documentType),
      content: renderResult.markdown,
      warnings: renderResult.warnings,
      status: "draft",
      source: "static-template",
      createdAt: generatedAt,
      updatedAt: generatedAt,
    };
  }
}
