import type { RefObject } from "react";
import { useState } from "react";

import { countTodoComments } from "../../domain/documents/template-helpers";
import { getDownloadFilename } from "../../domain/documents/draftDocumentUtils";
import type { DraftDocument } from "../../domain/models/draftDocument";
import { getDocumentDisplayName } from "../../domain/models/documentType";
import {
  copyMarkdownToClipboard,
  downloadMarkdownFile,
} from "../documents/draftActions";
import { SafeMarkdownPreview } from "./SafeMarkdownPreview";

export type DraftViewMode = "preview" | "edit";

function getSourceLabel(draft: DraftDocument): string {
  if (draft.source === "ai-generated") {
    const model = draft.aiMetadata?.model;
    return model !== undefined ? `AI-generated (${model})` : "AI-generated";
  }

  return "Static template";
}

export function DraftPreviewView({
  draft,
  previewRef,
  viewMode,
  onViewModeChange,
  onContentChange,
  onReset,
  onRegenerateWithAI,
  isRegenerating = false,
}: {
  draft: DraftDocument;
  previewRef?: RefObject<HTMLElement | null>;
  viewMode: DraftViewMode;
  onViewModeChange: (mode: DraftViewMode) => void;
  onContentChange: (content: string) => void;
  onReset: () => void;
  onRegenerateWithAI?: () => void;
  isRegenerating?: boolean;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [copyError, setCopyError] = useState<string | null>(null);
  const todoCount = countTodoComments(draft.content);
  const downloadFilename = getDownloadFilename(draft.destinationPath);

  async function handleCopy(): Promise<void> {
    try {
      await copyMarkdownToClipboard(draft.content);
      setCopyState("copied");
      setCopyError(null);
      window.setTimeout(() => {
        setCopyState("idle");
      }, 2000);
    } catch (error) {
      setCopyState("error");
      setCopyError(
        error instanceof Error
          ? error.message
          : "Unable to copy Markdown to the clipboard.",
      );
    }
  }

  function handleDownload(): void {
    downloadMarkdownFile(draft.content, downloadFilename);
  }

  function handleRegenerate(): void {
    if (onRegenerateWithAI === undefined || isRegenerating) {
      return;
    }

    onRegenerateWithAI();
  }

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
          <p>Source: {getSourceLabel(draft)}</p>
          {draft.isDirty ? (
            <p className="text-amber-300" data-testid="draft-dirty-indicator">
              Unsaved local changes
            </p>
          ) : null}
          {todoCount > 0 ? (
            <p data-testid="draft-todo-count">{todoCount} TODO placeholders</p>
          ) : null}
        </div>
      </div>

      {draft.warnings.length > 0 ? (
        <ul
          className="mt-3 space-y-1 rounded-md border border-amber-900/40 bg-amber-950/20 p-3"
          data-testid="draft-warnings"
        >
          {draft.warnings.map((warning) => (
            <li className="text-xs text-amber-200" key={warning}>
              {warning}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />
        <button
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500"
          data-testid="copy-markdown-button"
          onClick={() => {
            void handleCopy();
          }}
          type="button"
        >
          Copy Markdown
        </button>
        <button
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500"
          data-testid="download-markdown-button"
          onClick={handleDownload}
          type="button"
        >
          Download
        </button>
        <button
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500"
          data-testid="reset-draft-button"
          onClick={onReset}
          type="button"
        >
          Reset draft
        </button>
        {draft.source === "ai-generated" && onRegenerateWithAI !== undefined ? (
          <button
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="regenerate-with-ai-button"
            disabled={isRegenerating}
            onClick={handleRegenerate}
            type="button"
          >
            {isRegenerating ? "Regenerating…" : "Regenerate with AI"}
          </button>
        ) : null}
        {copyState === "copied" ? (
          <span className="text-xs text-emerald-300" data-testid="copy-success-message">
            Copied
          </span>
        ) : null}
        {copyState === "error" && copyError !== null ? (
          <span className="text-xs text-red-300" data-testid="copy-error-message">
            {copyError}
          </span>
        ) : null}
      </div>

      {viewMode === "edit" ? (
        <textarea
          className="mt-3 h-80 w-full rounded-md border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200"
          data-testid="draft-edit-content"
          onChange={(event) => {
            onContentChange(event.target.value);
          }}
          value={draft.content}
        />
      ) : (
        <div className="mt-3 max-h-80 overflow-auto rounded-md border border-slate-800 bg-slate-950 p-3 text-sm text-slate-200">
          <SafeMarkdownPreview content={draft.content} />
        </div>
      )}
    </section>
  );
}

function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: DraftViewMode;
  onChange: (mode: DraftViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-slate-700 p-0.5">
      <button
        className={`rounded px-3 py-1 text-xs font-medium ${
          mode === "preview"
            ? "bg-slate-800 text-slate-100"
            : "text-slate-400 hover:text-slate-200"
        }`}
        data-testid="draft-view-mode-preview"
        onClick={() => {
          onChange("preview");
        }}
        type="button"
      >
        Preview
      </button>
      <button
        className={`rounded px-3 py-1 text-xs font-medium ${
          mode === "edit"
            ? "bg-slate-800 text-slate-100"
            : "text-slate-400 hover:text-slate-200"
        }`}
        data-testid="draft-view-mode-edit"
        onClick={() => {
          onChange("edit");
        }}
        type="button"
      >
        Edit
      </button>
    </div>
  );
}
