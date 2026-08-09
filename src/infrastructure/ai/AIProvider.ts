import type { AIFactsPayload } from "../../domain/ai/aiFactsPayload";
import type { DocumentType } from "../../domain/models/documentType";

export interface AIGenerationRequest {
  documentType: DocumentType;
  facts: AIFactsPayload;
  staticTemplate: string;
  userInstructions?: string;
}

export interface AIGenerationResult {
  markdown: string;
  provider: string;
  model: string;
}

export interface AIProvider {
  readonly id: string;
  readonly displayName: string;

  generateDocument(request: AIGenerationRequest): Promise<AIGenerationResult>;
}
