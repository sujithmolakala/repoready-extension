import { useEffect, useMemo, useRef, useState } from "react";

import { GenerateDocumentUseCase } from "../../application/GenerateDocumentUseCase";
import type { DocumentOpportunity } from "../../domain/documents/documentOpportunities";
import { getDocumentOpportunities } from "../../domain/documents/documentOpportunities";
import type { DraftDocument } from "../../domain/models/draftDocument";
import type { DocumentType } from "../../domain/models/documentType";
import type { HealthReport } from "../../domain/models/healthReport";
import type { RepositoryFacts } from "../../domain/models/repositoryFacts";
import {
  createInitialDocumentDraftState,
  getSelectedDraft,
  selectDraft,
  shouldShowPreviewDraftButton,
  storeGeneratedDraft,
} from "../documents/documentDraftState";
import { DraftPreviewView } from "./DraftPreviewView";

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
  const [draftState, setDraftState] = useState(createInitialDocumentDraftState);
  const [previewFocusKey, setPreviewFocusKey] = useState(0);
  const previewRef = useRef<HTMLElement | null>(null);

  const selectedDraft = getSelectedDraft(draftState);

  useEffect(() => {
    if (selectedDraft === null || previewRef.current === null) {
      return;
    }

    previewRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [previewFocusKey, selectedDraft]);

  function handleGenerateDraft(documentType: DocumentType): void {
    const draft = generateDocumentUseCase.execute({
      owner: facts.owner,
      repo: facts.name,
      documentType,
      facts,
    });

    setDraftState((currentState) => storeGeneratedDraft(currentState, draft));
    setPreviewFocusKey((currentKey) => currentKey + 1);
  }

  function handlePreviewDraft(documentType: DocumentType): void {
    setDraftState((currentState) => selectDraft(currentState, documentType));
    setPreviewFocusKey((currentKey) => currentKey + 1);
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
          Generate conservative draft files from repository facts. Existing files are
          not replaced.
        </p>
      </div>

      {selectedDraft ? (
        <DraftPreviewView draft={selectedDraft} previewRef={previewRef} />
      ) : null}

      {opportunities.length > 0 ? (
        <ul className="space-y-3">
          {opportunities.map((opportunity) => (
            <DocumentOpportunityCard
              draft={draftState.drafts[opportunity.documentType] ?? null}
              isSelected={
                draftState.selectedDocumentType === opportunity.documentType
              }
              key={opportunity.documentType}
              onGenerateDraft={() => {
                handleGenerateDraft(opportunity.documentType);
              }}
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
    </section>
  );
}

export function DocumentOpportunityCard({
  opportunity,
  draft,
  isSelected,
  showPreviewButton,
  onGenerateDraft,
  onPreviewDraft,
}: {
  opportunity: DocumentOpportunity;
  draft: DraftDocument | null;
  isSelected: boolean;
  showPreviewButton: boolean;
  onGenerateDraft: () => void;
  onPreviewDraft: () => void;
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
          className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-slate-200"
          onClick={onGenerateDraft}
          type="button"
        >
          Generate draft
        </button>

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
          Draft ready for preview
        </p>
      ) : null}
    </li>
  );
}
