export function ScoreRing({
  score,
  maxScore,
}: {
  score: number;
  maxScore: number;
}) {
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = (percentage / 100) * circumference;
  const tone =
    percentage >= 75 ? "#34d399" : percentage >= 50 ? "#fbbf24" : "#f87171";

  return (
    <div className="flex items-center gap-4">
      <svg
        aria-hidden="true"
        className="h-24 w-24 -rotate-90"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          fill="none"
          r={radius}
          stroke="#1e293b"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          fill="none"
          r={radius}
          stroke={tone}
          strokeDasharray={`${String(progress)} ${String(circumference)}`}
          strokeLinecap="round"
          strokeWidth="8"
        />
      </svg>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Repository Health Score
        </p>
        <p className="text-3xl font-semibold text-slate-100">
          {score}/{maxScore}
        </p>
        <p className="text-sm text-slate-400">{percentage}%</p>
      </div>
    </div>
  );
}

export function CategoryProgressBar({
  awarded,
  max,
}: {
  awarded: number;
  max: number;
}) {
  const percentage = max > 0 ? Math.min(100, Math.round((awarded / max) * 100)) : 0;

  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full rounded-full bg-emerald-500/80 transition-all"
        style={{ width: `${String(percentage)}%` }}
      />
    </div>
  );
}
