import type { DocumentType } from "./documentType";

export type DraftDocumentStatus = "draft" | "editing" | "approved" | "written";

export type DraftDocumentSource = "static-template" | "ai-generated";

export interface DraftDocumentAIMetadata {
  provider: string;
  model: string;
}

export interface DraftDocument {
  id: string;
  owner: string;
  repo: string;
  documentType: DocumentType;
  destinationPath: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  warnings: string[];
  status: DraftDocumentStatus;
  source: DraftDocumentSource;
  aiMetadata?: DraftDocumentAIMetadata;
  createdAt: string;
  updatedAt: string;
}
