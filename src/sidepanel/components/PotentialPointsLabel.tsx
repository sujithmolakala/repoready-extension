export function PotentialPointsLabel({
  points,
  suffix = "pts",
}: {
  points: number;
  suffix?: "pts" | "points";
}) {
  return (
    <p
      className="text-xs leading-snug text-slate-400 [overflow-wrap:anywhere]"
      data-testid="potential-points-label"
    >
      <span className="whitespace-nowrap">Up to {points}</span>{" "}
      <span className="whitespace-nowrap">{suffix}</span>
    </p>
  );
}
