import { useState } from "react";

import type {
  CheckResult,
  HealthReport,
  PluginResult,
} from "../../domain/models/healthReport";

function scoreTone(totalScore: number, maxScore: number): string {
  if (maxScore === 0) {
    return "text-slate-300";
  }

  const ratio = totalScore / maxScore;

  if (ratio >= 0.75) {
    return "text-emerald-400";
  }

  if (ratio >= 0.5) {
    return "text-amber-400";
  }

  return "text-red-400";
}

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

function CategoryCard({ category }: { category: PluginResult }) {
  return (
    <section className="rounded-md border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-slate-100">
          {category.categoryLabel}
        </h3>
        <p className="text-sm text-slate-300">
          {category.pointsAwarded}/{category.maxPoints}
        </p>
      </div>

      <ul className="mt-3 space-y-2">
        {category.checks.map((check) => (
          <li
            className="rounded-md border border-slate-800/80 px-3 py-2"
            key={check.id}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-slate-200">{check.label}</p>
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
    </section>
  );
}

export function HealthScoreView({ report }: { report: HealthReport }) {
  const tone = scoreTone(report.totalScore, report.maxScore);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Repository Health Score
        </p>
        <p className={`mt-2 text-3xl font-semibold ${tone}`}>
          {report.totalScore}/100
        </p>
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
              <li
                className="rounded-md border border-slate-800/80 px-3 py-2"
                key={recommendation.id}
              >
                <p className="text-sm text-slate-200">{recommendation.title}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {recommendation.description}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Up to {recommendation.potentialPoints} points ·{" "}
                  {recommendation.actionType}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
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
