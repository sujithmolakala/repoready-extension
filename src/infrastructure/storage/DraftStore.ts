import type { DocumentType } from "../../domain/models/documentType";
import {
  getDraftStorageKey,
  normalizeStoredDraft,
} from "../../domain/documents/draftDocumentUtils";
import type { DraftDocument } from "../../domain/models/draftDocument";

export class DraftStore {
  async saveDraft(draft: DraftDocument): Promise<void> {
    const storageKey = getDraftStorageKey(
      draft.owner,
      draft.repo,
      draft.documentType,
    );

    await chrome.storage.local.set({ [storageKey]: draft });
  }

  async loadDraftsForRepository(
    owner: string,
    repo: string,
  ): Promise<Partial<Record<DocumentType, DraftDocument>>> {
    const prefix = `draft:${owner}/${repo}/`;
    const allItems = await chrome.storage.local.get(null);
    const drafts: Partial<Record<DocumentType, DraftDocument>> = {};

    for (const [key, value] of Object.entries(allItems)) {
      if (!key.startsWith(prefix)) {
        continue;
      }

      const draft = normalizeStoredDraft(value);

      if (draft === null || draft.owner !== owner || draft.repo !== repo) {
        continue;
      }

      drafts[draft.documentType] = draft;
    }

    return drafts;
  }
}
