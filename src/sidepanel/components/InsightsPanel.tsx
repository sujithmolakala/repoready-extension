import type { RepositoryInsights } from "../../domain/insights/types";
import type { CheckStatus } from "../../domain/models/healthReport";

function statusSymbol(status: CheckStatus): string {
  switch (status) {
    case "passed":
      return "✓";
    case "failed":
      return "✕";
    case "undetermined":
      return "?";
    default:
      return "·";
  }
}

function statusClass(status: CheckStatus): string {
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

export function InsightsPanel({ insights }: { insights: RepositoryInsights }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-slate-100">Insights</h3>
        <p className="mt-1 text-xs text-slate-500">
          Informational analysis only — these checks do not change the 100-point
          health score.
        </p>
      </div>

      {insights.sections.map((section) => (
        <details
          className="rounded-md border border-slate-800 bg-slate-950/70"
          key={section.categoryId}
          open={section.categoryId === "language"}
        >
          <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-slate-200">
            {section.categoryLabel}
            <span className="ml-2 text-xs font-normal text-slate-500">
              {section.items.length} checks
            </span>
          </summary>
          <ul className="space-y-2 border-t border-slate-800 px-3 py-3">
            {section.items.map((item) => (
              <li className="flex items-start gap-2 text-xs" key={item.id}>
                <span
                  aria-hidden="true"
                  className={`mt-0.5 font-mono ${statusClass(item.status)}`}
                >
                  {statusSymbol(item.status)}
                </span>
                <div>
                  <p className="text-slate-200">{item.label}</p>
                  <p className="mt-0.5 text-slate-500">{item.explanation}</p>
                </div>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
