export interface HealthScoreSnapshot {
  owner: string;
  repo: string;
  totalScore: number;
  categoryScores: {
    categoryId: string;
    pointsAwarded: number;
    maxPoints: number;
  }[];
  analyzedAt: string;
  repositoryPushedAt?: string | null;
}

export interface ScoreTrend {
  currentScore: number;
  previousScore: number | null;
  change: number | null;
  snapshots: HealthScoreSnapshot[];
}

export const MAX_SNAPSHOTS_PER_REPOSITORY = 30;

export const MIN_HOURS_BETWEEN_TIME_BASED_SNAPSHOTS = 24;

export function historyStorageKey(owner: string, repo: string): string {
  return `history:${owner}/${repo}`;
}

export function shouldRecordSnapshot(input: {
  snapshots: HealthScoreSnapshot[];
  next: HealthScoreSnapshot;
  force?: boolean;
}): boolean {
  if (input.force) {
    return true;
  }

  const latest = input.snapshots.at(-1);

  if (latest === undefined) {
    return true;
  }

  if (latest.totalScore !== input.next.totalScore) {
    return true;
  }

  if (latest.repositoryPushedAt !== input.next.repositoryPushedAt) {
    return true;
  }

  const latestCategories = JSON.stringify(latest.categoryScores);
  const nextCategories = JSON.stringify(input.next.categoryScores);

  if (latestCategories !== nextCategories) {
    return true;
  }

  const latestTime = Date.parse(latest.analyzedAt);
  const nextTime = Date.parse(input.next.analyzedAt);

  if (
    Number.isFinite(latestTime) &&
    Number.isFinite(nextTime) &&
    nextTime - latestTime >= MIN_HOURS_BETWEEN_TIME_BASED_SNAPSHOTS * 60 * 60 * 1000
  ) {
    return true;
  }

  return false;
}

export function appendSnapshot(
  snapshots: HealthScoreSnapshot[],
  snapshot: HealthScoreSnapshot,
  force = false,
): HealthScoreSnapshot[] {
  if (!shouldRecordSnapshot({ snapshots, next: snapshot, force })) {
    return snapshots;
  }

  return [...snapshots, snapshot].slice(-MAX_SNAPSHOTS_PER_REPOSITORY);
}

export function calculateScoreTrend(
  snapshots: HealthScoreSnapshot[],
): ScoreTrend {
  const current = snapshots.at(-1);

  if (current === undefined) {
    return {
      currentScore: 0,
      previousScore: null,
      change: null,
      snapshots: [],
    };
  }

  const previous = snapshots.length >= 2 ? snapshots.at(-2) ?? null : null;

  return {
    currentScore: current.totalScore,
    previousScore: previous?.totalScore ?? null,
    change:
      previous === null ? null : current.totalScore - previous.totalScore,
    snapshots,
  };
}

export function createSnapshotFromReport(
  facts: import("./repositoryFacts").RepositoryFacts,
  report: import("./healthReport").HealthReport,
): HealthScoreSnapshot {
  return {
    owner: facts.owner,
    repo: facts.name,
    totalScore: report.totalScore,
    categoryScores: report.categories.map((category) => ({
      categoryId: category.categoryId,
      pointsAwarded: category.pointsAwarded,
      maxPoints: category.maxPoints,
    })),
    analyzedAt: report.analyzedAt,
    repositoryPushedAt: facts.activity.pushedAt,
  };
}
