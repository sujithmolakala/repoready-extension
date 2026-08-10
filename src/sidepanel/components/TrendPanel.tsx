import type { ScoreTrend } from "../../domain/models/healthHistory";

export function TrendPanel({ trend }: { trend: ScoreTrend }) {
  if (trend.snapshots.length < 2) {
    return (
      <section className="rounded-md border border-slate-800 bg-slate-950/70 p-3">
        <h3 className="text-sm font-medium text-slate-100">Score History</h3>
        <p className="mt-2 text-xs text-slate-400">
          No score history yet. Re-analyze this repository after it changes to
          see trends.
        </p>
      </section>
    );
  }

  const changeLabel =
    trend.change === null
      ? "—"
      : trend.change > 0
        ? `+${String(trend.change)}`
        : String(trend.change);

  return (
    <section className="rounded-md border border-slate-800 bg-slate-950/70 p-3">
      <h3 className="text-sm font-medium text-slate-100">Score History</h3>
      <div className="mt-3 flex items-end gap-3">
        <div>
          <p className="text-xs text-slate-500">Current</p>
          <p className="text-2xl font-semibold text-slate-100">
            {trend.currentScore}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Previous</p>
          <p className="text-lg text-slate-300">{trend.previousScore ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Change</p>
          <p
            className={`text-lg font-medium ${
              trend.change !== null && trend.change >= 0
                ? "text-emerald-400"
                : "text-red-300"
            }`}
          >
            {changeLabel}
          </p>
        </div>
      </div>

      <MiniTrendChart snapshots={trend.snapshots} />

      <ul className="mt-3 space-y-1">
        {trend.snapshots
          .slice(-5)
          .reverse()
          .map((snapshot) => (
            <li className="text-xs text-slate-500" key={snapshot.analyzedAt}>
              {snapshot.analyzedAt.slice(0, 10)} · {snapshot.totalScore}/100
            </li>
          ))}
      </ul>
    </section>
  );
}

function MiniTrendChart({
  snapshots,
}: {
  snapshots: ScoreTrend["snapshots"];
}) {
  const recent = snapshots.slice(-8);
  const max = 100;
  const width = 160;
  const height = 40;
  const step = recent.length > 1 ? width / (recent.length - 1) : width;

  const points = recent
    .map((snapshot, index) => {
      const x = index * step;
      const y = height - (snapshot.totalScore / max) * height;
      return `${String(x)},${String(y)}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      className="mt-3 text-emerald-400"
      height={height}
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      width={width}
    >
      <polyline
        fill="none"
        points={points}
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
