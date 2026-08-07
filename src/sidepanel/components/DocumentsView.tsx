import { useMemo, useState } from "react";

import { GenerateDocumentUseCase } from "../../application/GenerateDocumentUseCase";
import type { DocumentOpportunity } from "../../domain/documents/documentOpportunities";
import { getDocumentOpportunities } from "../../domain/documents/documentOpportunities";
import type { DraftDocument } from "../../domain/models/draftDocument";
import type { DocumentType } from "../../domain/models/documentType";
import type { HealthReport } from "../../domain/models/healthReport";
import type { RepositoryFacts } from "../../domain/models/repositoryFacts";
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
  const [drafts, setDrafts] = useState<Partial<Record<DocumentType, DraftDocument>>>({});
  const [selectedDocumentType, setSelectedDocumentType] =
    useState<DocumentType | null>(null);

  const selectedDraft =
    selectedDocumentType === null ? null : drafts[selectedDocumentType] ?? null;

  function handleGenerateDraft(documentType: DocumentType): void {
    const draft = generateDocumentUseCase.execute({
      owner: facts.owner,
      repo: facts.name,
      documentType,
      facts,
    });

    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [documentType]: draft,
    }));
    setSelectedDocumentType(documentType);
  }

  if (opportunities.length === 0 && Object.keys(drafts).length === 0) {
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

      {opportunities.length > 0 ? (
        <ul className="space-y-3">
          {opportunities.map((opportunity) => (
            <DocumentOpportunityCard
              draft={drafts[opportunity.documentType] ?? null}
              isSelected={selectedDocumentType === opportunity.documentType}
              key={opportunity.documentType}
              onGenerateDraft={() => {
                handleGenerateDraft(opportunity.documentType);
              }}
              onSelectDraft={() => {
                setSelectedDocumentType(opportunity.documentType);
              }}
              opportunity={opportunity}
            />
          ))}
        </ul>
      ) : null}

      {selectedDraft ? <DraftPreviewView draft={selectedDraft} /> : null}
    </section>
  );
}

function DocumentOpportunityCard({
  opportunity,
  draft,
  isSelected,
  onGenerateDraft,
  onSelectDraft,
}: {
  opportunity: DocumentOpportunity;
  draft: DraftDocument | null;
  isSelected: boolean;
  onGenerateDraft: () => void;
  onSelectDraft: () => void;
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

        {draft ? (
          <button
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              isSelected
                ? "border-emerald-500 text-emerald-300"
                : "border-slate-700 text-slate-300 hover:border-slate-500"
            }`}
            onClick={onSelectDraft}
            type="button"
          >
            Preview draft
          </button>
        ) : null}
      </div>
    </li>
  );
}
