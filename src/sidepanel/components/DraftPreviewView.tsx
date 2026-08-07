import type { RefObject } from "react";

import { countTodoComments } from "../../domain/documents/template-helpers";
import type { DraftDocument } from "../../domain/models/draftDocument";
import { getDocumentDisplayName } from "../../domain/models/documentType";

export function DraftPreviewView({
  draft,
  previewRef,
}: {
  draft: DraftDocument;
  previewRef?: RefObject<HTMLElement | null>;
}) {
  const todoCount = countTodoComments(draft.content);

  return (
    <section
      className="rounded-md border border-emerald-900/40 bg-slate-950/70 p-3"
      data-testid="draft-preview"
      ref={previewRef}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-slate-100">
            {getDocumentDisplayName(draft.documentType)}
          </h3>
          <p className="mt-1 text-xs text-slate-500">{draft.destinationPath}</p>
        </div>
        <div className="text-right text-xs text-slate-400">
          <p>Status: {draft.status}</p>
          <p>Source: {draft.source}</p>
          {todoCount > 0 ? (
            <p data-testid="draft-todo-count">{todoCount} TODO placeholders</p>
          ) : null}
        </div>
      </div>

      {draft.warnings.length > 0 ? (
        <ul className="mt-3 space-y-1 rounded-md border border-amber-900/40 bg-amber-950/20 p-3">
          {draft.warnings.map((warning) => (
            <li className="text-xs text-amber-200" key={warning}>
              {warning}
            </li>
          ))}
        </ul>
      ) : null}

      <textarea
        className="mt-3 h-80 w-full rounded-md border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200"
        data-testid="draft-preview-content"
        readOnly
        value={draft.content}
      />
    </section>
  );
}
