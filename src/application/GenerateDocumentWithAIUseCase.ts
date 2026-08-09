import { AIError, AIErrorCode } from "../domain/ai/aiErrors";
import { buildAIFactsPayload } from "../domain/ai/aiFactsPayload";
import { validateAIMarkdown } from "../domain/ai/aiMarkdownValidator";
import { renderDocumentTemplate } from "../domain/documents/documentTemplates";
import { createGeneratedDraft } from "../domain/documents/draftDocumentUtils";
import { getDocumentDestinationPath } from "../domain/models/documentType";
import type { DocumentType } from "../domain/models/documentType";
import type { DraftDocument } from "../domain/models/draftDocument";
import type { RepositoryFacts } from "../domain/models/repositoryFacts";
import type { AIProvider } from "../infrastructure/ai/AIProvider";

export interface GenerateDocumentWithAIInput {
  owner: string;
  repo: string;
  documentType: DocumentType;
  facts: RepositoryFacts;
  userInstructions?: string;
  generatedAt?: string;
}

export class GenerateDocumentWithAIUseCase {
  constructor(private readonly aiProvider: AIProvider) {}

  async execute(input: GenerateDocumentWithAIInput): Promise<DraftDocument> {
    const generatedAt = input.generatedAt ?? new Date().toISOString();
    const staticRender = renderDocumentTemplate(input.documentType, input.facts);
    const aiFacts = buildAIFactsPayload(input.facts);

    const aiResult = await this.aiProvider.generateDocument({
      documentType: input.documentType,
      facts: aiFacts,
      staticTemplate: staticRender.markdown,
      userInstructions: input.userInstructions,
    });

    const validation = validateAIMarkdown(aiResult.markdown, aiFacts);

    if (!validation.isValid) {
      throw new AIError(
        AIErrorCode.EMPTY_OUTPUT,
        validation.rejectionReason ?? "OpenAI returned an invalid document response.",
      );
    }

    const warnings = [...staticRender.warnings, ...validation.warnings];

    return createGeneratedDraft({
      id: `${input.owner}/${input.repo}/${input.documentType}`,
      owner: input.owner,
      repo: input.repo,
      documentType: input.documentType,
      destinationPath: getDocumentDestinationPath(input.documentType),
      content: aiResult.markdown,
      warnings,
      status: "draft",
      source: "ai-generated",
      aiMetadata: {
        provider: aiResult.provider,
        model: aiResult.model,
      },
      createdAt: generatedAt,
      updatedAt: generatedAt,
    });
  }
}
