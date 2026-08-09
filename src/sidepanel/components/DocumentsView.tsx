import { useEffect, useMemo, useRef, useState } from "react";

import { GenerateDocumentUseCase } from "../../application/GenerateDocumentUseCase";
import { MAX_USER_INSTRUCTIONS_LENGTH } from "../../domain/ai/promptBuilder";
import type { DocumentOpportunity } from "../../domain/documents/documentOpportunities";
import { getDocumentOpportunities } from "../../domain/documents/documentOpportunities";
import type { DraftDocument } from "../../domain/models/draftDocument";
import type { DocumentType } from "../../domain/models/documentType";
import type { HealthReport } from "../../domain/models/healthReport";
import type { RepositoryFacts } from "../../domain/models/repositoryFacts";
import { DraftStore } from "../../infrastructure/storage/DraftStore";
import { useOpenAIConfig } from "../../shared/hooks/useOpenAIConfig";
import {
  createInitialDocumentDraftState,
  getSelectedDraft,
  replaceGeneratedDraft,
  resetDraftContent,
  selectDraft,
  shouldShowPreviewDraftButton,
  storeGeneratedDraft,
  updateDraftContent,
} from "../documents/documentDraftState";
import { openOptionsPage, useAIGeneration } from "../documents/useAIGeneration";
import { DraftPreviewView, type DraftViewMode } from "./DraftPreviewView";

const generateDocumentUseCase = new GenerateDocumentUseCase();

interface DocumentsViewProps {
  facts: RepositoryFacts;
  report: HealthReport;
}

export function DocumentsView({ facts, report }: DocumentsViewProps) {
  const opportunities = useMemo(
    () => getDocumentOpportunities(facts, report),
    [facts, report],
  );
  const draftStore = useMemo(() => new DraftStore(), []);
  const { openAIConfig, isLoading: isOpenAIConfigLoading } = useOpenAIConfig();
  const { isGenerating, error: aiError, generateWithAI, clearError } =
    useAIGeneration();
  const [draftState, setDraftState] = useState(createInitialDocumentDraftState);
  const [viewMode, setViewMode] = useState<DraftViewMode>("preview");
  const [previewFocusKey, setPreviewFocusKey] = useState(0);
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [userInstructions, setUserInstructions] = useState("");
  const [hasAcknowledgedPrivacy, setHasAcknowledgedPrivacy] = useState(false);
  const [generatingDocumentType, setGeneratingDocumentType] =
    useState<DocumentType | null>(null);
  const previewRef = useRef<HTMLElement | null>(null);

  const selectedDraft = getSelectedDraft(draftState);

  useEffect(() => {
    let cancelled = false;

    void draftStore
      .loadDraftsForRepository(facts.owner, facts.name)
      .then((loadedDrafts) => {
        if (cancelled) {
          return;
        }

        setDraftState((currentState) => ({
          ...currentState,
          drafts: {
            ...loadedDrafts,
            ...currentState.drafts,
          },
        }));
        setDraftsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [draftStore, facts.owner, facts.name]);

  useEffect(() => {
    if (!draftsLoaded) {
      return;
    }

    const drafts: DraftDocument[] = [];

    for (const documentType of Object.keys(draftState.drafts) as DocumentType[]) {
      const draft = draftState.drafts[documentType];

      if (draft !== undefined) {
        drafts.push(draft);
      }
    }

    void Promise.all(drafts.map((draft) => draftStore.saveDraft(draft)));
  }, [draftState.drafts, draftStore, draftsLoaded]);

  useEffect(() => {
    if (selectedDraft === null || previewRef.current === null) {
      return;
    }

    previewRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [previewFocusKey, selectedDraft]);

  function handleGenerateStaticDraft(documentType: DocumentType): void {
    const draft = generateDocumentUseCase.execute({
      owner: facts.owner,
      repo: facts.name,
      documentType,
      facts,
    });

    setDraftState((currentState) => storeGeneratedDraft(currentState, draft));
    setViewMode("preview");
    setPreviewFocusKey((currentKey) => currentKey + 1);
    clearError();
  }

  async function handleGenerateWithAI(
    documentType: DocumentType,
    regenerate = false,
  ): Promise<void> {
    if (!openAIConfig.configured || isGenerating) {
      return;
    }

    const existingDraft = draftState.drafts[documentType];

    if (
      regenerate &&
      existingDraft?.isDirty &&
      !window.confirm(
        "Regenerate with AI and discard your local edits to this draft?",
      )
    ) {
      return;
    }

    setGeneratingDocumentType(documentType);
    clearError();

    const draft = await generateWithAI({
      owner: facts.owner,
      repo: facts.name,
      documentType,
      facts,
      userInstructions:
        userInstructions.trim().length > 0 ? userInstructions.trim() : undefined,
    });

    setGeneratingDocumentType(null);

    if (draft === null) {
      return;
    }

    setDraftState((currentState) =>
      regenerate
        ? replaceGeneratedDraft(currentState, draft)
        : storeGeneratedDraft(currentState, draft),
    );
    setViewMode("preview");
    setPreviewFocusKey((currentKey) => currentKey + 1);
  }

  function handlePreviewDraft(documentType: DocumentType): void {
    setDraftState((currentState) => selectDraft(currentState, documentType));
    setPreviewFocusKey((currentKey) => currentKey + 1);
  }

  function handleContentChange(content: string): void {
    if (selectedDraft === null) {
      return;
    }

    setDraftState((currentState) =>
      updateDraftContent(
        currentState,
        selectedDraft.documentType,
        content,
        new Date().toISOString(),
      ),
    );
  }

  function handleResetDraft(): void {
    if (selectedDraft === null) {
      return;
    }

    if (
      selectedDraft.isDirty &&
      !window.confirm("Discard local edits and restore the generated draft?")
    ) {
      return;
    }

    setDraftState((currentState) =>
      resetDraftContent(
        currentState,
        selectedDraft.documentType,
        new Date().toISOString(),
      ),
    );
  }

  if (opportunities.length === 0 && Object.keys(draftState.drafts).length === 0) {
    return (
      <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-medium text-slate-200">Documents</h2>
        <p className="mt-3 text-sm text-slate-400">
          No missing documents were identified for generation in this repository.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 space-y-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <div>
        <h2 className="text-sm font-medium text-slate-200">Documents</h2>
        <p className="mt-1 text-xs text-slate-400">
          Generate conservative draft files from repository facts, or use AI to
          improve prose around verified facts. Existing files are not replaced.
        </p>
      </div>

      {selectedDraft ? (
        <DraftPreviewView
          draft={selectedDraft}
          isRegenerating={
            isGenerating && generatingDocumentType === selectedDraft.documentType
          }
          onContentChange={handleContentChange}
          onRegenerateWithAI={
            openAIConfig.configured
              ? () => {
                  void handleGenerateWithAI(selectedDraft.documentType, true);
                }
              : undefined
          }
          onReset={handleResetDraft}
          onViewModeChange={setViewMode}
          previewRef={previewRef}
          viewMode={viewMode}
        />
      ) : null}

      {aiError ? (
        <p
          className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-200"
          data-testid="ai-generation-error"
        >
          {aiError.message}
        </p>
      ) : null}

      {opportunities.length > 0 ? (
        <ul className="space-y-3">
          {opportunities.map((opportunity) => (
            <DocumentOpportunityCard
              draft={draftState.drafts[opportunity.documentType] ?? null}
              isGenerating={
                isGenerating && generatingDocumentType === opportunity.documentType
              }
              isOpenAIConfigured={openAIConfig.configured}
              isOpenAIConfigLoading={isOpenAIConfigLoading}
              isSelected={
                draftState.selectedDocumentType === opportunity.documentType
              }
              key={opportunity.documentType}
              onGenerateStaticDraft={() => {
                handleGenerateStaticDraft(opportunity.documentType);
              }}
              onGenerateWithAI={() => {
                void handleGenerateWithAI(opportunity.documentType);
              }}
              onOpenSettings={openOptionsPage}
              onPreviewDraft={() => {
                handlePreviewDraft(opportunity.documentType);
              }}
              opportunity={opportunity}
              showPreviewButton={shouldShowPreviewDraftButton(
                draftState.drafts,
                opportunity.documentType,
              )}
            />
          ))}
        </ul>
      ) : null}

      {openAIConfig.configured ? (
        <div className="space-y-2 rounded-md border border-slate-800 bg-slate-950/50 p-3">
          {!hasAcknowledgedPrivacy ? (
            <p className="text-xs text-slate-400">
              AI generation sends selected repository facts to OpenAI (repo name,
              README excerpt, detected language/package manager, test/install
              commands, relevant file metadata). Nothing is sent until you click
              Generate with AI.
              <button
                className="ml-2 text-emerald-300 underline hover:text-emerald-200"
                onClick={() => {
                  setHasAcknowledgedPrivacy(true);
                }}
                type="button"
              >
                Got it
              </button>
            </p>
          ) : null}
          <label className="block space-y-1">
            <span className="text-xs text-slate-400">
              Additional instructions (optional)
            </span>
            <input
              className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
              maxLength={MAX_USER_INSTRUCTIONS_LENGTH}
              onChange={(event) => {
                setUserInstructions(event.target.value);
              }}
              placeholder="Keep this concise and friendly."
              type="text"
              value={userInstructions}
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}

export function DocumentOpportunityCard({
  opportunity,
  draft,
  isSelected,
  showPreviewButton,
  isOpenAIConfigured,
  isOpenAIConfigLoading,
  isGenerating,
  onGenerateStaticDraft,
  onGenerateWithAI,
  onPreviewDraft,
  onOpenSettings,
}: {
  opportunity: DocumentOpportunity;
  draft: DraftDocument | null;
  isSelected: boolean;
  showPreviewButton: boolean;
  isOpenAIConfigured: boolean;
  isOpenAIConfigLoading: boolean;
  isGenerating: boolean;
  onGenerateStaticDraft: () => void;
  onGenerateWithAI: () => void;
  onPreviewDraft: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <li className="rounded-md border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-100">
            {opportunity.displayName}
          </p>
          <p className="mt-1 text-xs text-slate-500">{opportunity.destinationPath}</p>
        </div>
        <p className="text-xs text-slate-400">
          Up to {opportunity.potentialPoints} pts
        </p>
      </div>

      <p className="mt-2 text-xs text-slate-400">{opportunity.reason}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isGenerating}
          onClick={onGenerateStaticDraft}
          type="button"
        >
          Generate static draft
        </button>

        {isOpenAIConfigLoading ? (
          <span className="text-xs text-slate-500">Checking OpenAI…</span>
        ) : isOpenAIConfigured ? (
          <button
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="generate-with-ai-button"
            disabled={isGenerating}
            onClick={onGenerateWithAI}
            type="button"
          >
            {isGenerating ? "Generating…" : "Generate with AI"}
          </button>
        ) : (
          <button
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500"
            onClick={onOpenSettings}
            type="button"
          >
            Connect OpenAI in Settings
          </button>
        )}

        {showPreviewButton ? (
          <button
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              isSelected
                ? "border-emerald-500 text-emerald-300"
                : "border-slate-700 text-slate-300 hover:border-slate-500"
            }`}
            onClick={onPreviewDraft}
            type="button"
          >
            Preview draft
          </button>
        ) : null}
      </div>

      {draft ? (
        <p className="mt-2 text-xs text-slate-500" data-testid="draft-generated-indicator">
          {draft.isDirty ? "Edited draft ready for preview" : "Draft ready for preview"}
          {draft.source === "ai-generated" ? " (AI-generated)" : ""}
        </p>
      ) : null}
    </li>
  );
}
