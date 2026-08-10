import { useState } from "react";

import type {
  CheckResult,
  HealthReport,
  PluginResult,
  Recommendation,
} from "../../domain/models/healthReport";
import type { DocumentType } from "../../domain/models/documentType";
import { mapRecommendationToDocumentTypes } from "../../domain/documents/recommendation-mapping";
import { CategoryProgressBar, ScoreRing } from "./ScoreRing";

function statusLabel(status: CheckResult["status"]): string {
  switch (status) {
    case "passed":
      return "Passed";
    case "failed":
      return "Failed";
    case "undetermined":
      return "Undetermined";
    default:
      return "Unknown";
  }
}

function statusClass(status: CheckResult["status"]): string {
  switch (status) {
    case "passed":
      return "text-emerald-400";
    case "failed":
      return "text-red-300";
    case "undetermined":
      return "text-amber-300";
    default:
      return "text-slate-300";
  }
}

function statusPrefix(status: CheckResult["status"]): string {
  switch (status) {
    case "passed":
      return "[PASS]";
    case "failed":
      return "[FAIL]";
    case "undetermined":
      return "[?]";
    default:
      return "[ ]";
  }
}

function CategoryCard({ category }: { category: PluginResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="rounded-md border border-slate-800 bg-slate-950/70">
      <button
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
        onClick={() => {
          setExpanded((value) => !value);
        }}
        type="button"
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-slate-100">
            {category.categoryLabel}
          </h3>
          <CategoryProgressBar
            awarded={category.pointsAwarded}
            max={category.maxPoints}
          />
        </div>
        <p className="shrink-0 text-sm text-slate-300">
          {category.pointsAwarded}/{category.maxPoints}
        </p>
      </button>

      {expanded ? (
        <ul className="space-y-2 border-t border-slate-800 px-3 pb-3 pt-2">
          {category.checks.map((check) => (
            <li
              className="rounded-md border border-slate-800/80 px-3 py-2"
              key={check.id}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-200">
                  <span className="mr-2 font-mono text-xs text-slate-500">
                    {statusPrefix(check.status)}
                  </span>
                  {check.label}
                </p>
                <span className={`text-xs font-medium ${statusClass(check.status)}`}>
                  {statusLabel(check.status)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{check.explanation}</p>
              <p className="mt-1 text-xs text-slate-500">
                {check.pointsAwarded}/{check.pointsAvailable} points
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function HealthScoreView({
  report,
  onGenerateFix,
}: {
  report: HealthReport;
  onGenerateFix?: (documentType: DocumentType) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-800 bg-slate-950/70 p-4">
        <ScoreRing maxScore={report.maxScore} score={report.totalScore} />
      </div>

      <div className="space-y-3">
        {report.categories.map((category) => (
          <CategoryCard category={category} key={category.categoryId} />
        ))}
      </div>

      {report.recommendations.length > 0 ? (
        <section className="rounded-md border border-slate-800 bg-slate-950/70 p-3">
          <h3 className="text-sm font-medium text-slate-100">Recommendations</h3>
          <ul className="mt-3 space-y-2">
            {report.recommendations.map((recommendation) => (
              <RecommendationRow
                key={recommendation.id}
                onGenerateFix={onGenerateFix}
                recommendation={recommendation}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function RecommendationRow({
  recommendation,
  onGenerateFix,
}: {
  recommendation: Recommendation;
  onGenerateFix?: (documentType: DocumentType) => void;
}) {
  const documentTypes = mapRecommendationToDocumentTypes(recommendation);
  const canGenerateFix = documentTypes.length > 0 && onGenerateFix !== undefined;
  const primaryDocumentType = documentTypes[0];

  return (
    <li className="rounded-md border border-slate-800/80 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-200">{recommendation.title}</p>
          <p className="mt-1 text-xs text-slate-400">
            {recommendation.description}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Up to {recommendation.potentialPoints} points
          </p>
        </div>
        {canGenerateFix ? (
          <button
            className="shrink-0 rounded-md border border-emerald-700 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:border-emerald-500"
            onClick={() => {
              onGenerateFix(primaryDocumentType);
            }}
            type="button"
          >
            Generate fix
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function DebugFactsPanel({
  debugFacts,
  isLoading = false,
  error = null,
}: {
  debugFacts: object | null;
  isLoading?: boolean;
  error?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="mt-6 flex min-h-0 flex-1 flex-col rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => {
          setIsOpen((open) => !open);
        }}
        type="button"
      >
        <h2 className="text-sm font-medium text-slate-200">
          Repository facts (development only)
        </h2>
        <span className="text-xs text-slate-400">{isOpen ? "Hide" : "Show"}</span>
      </button>

      {isOpen ? (
        <>
          {isLoading ? (
            <p className="mt-3 text-sm text-slate-400">Collecting repository facts…</p>
          ) : null}
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          {debugFacts ? (
            <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-300">
              {JSON.stringify(debugFacts, null, 2)}
            </pre>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
