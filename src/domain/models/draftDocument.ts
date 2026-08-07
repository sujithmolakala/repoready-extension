import type { DocumentType } from "./documentType";

export type DraftDocumentStatus = "draft" | "editing" | "approved" | "written";

export type DraftDocumentSource = "static-template";

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
  createdAt: string;
  updatedAt: string;
}
