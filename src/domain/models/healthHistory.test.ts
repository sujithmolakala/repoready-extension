import { describe, expect, it } from "vitest";

import {
  appendSnapshot,
  calculateScoreTrend,
  createSnapshotFromReport,
  shouldRecordSnapshot,
} from "../models/healthHistory";
import type { RepositoryFacts } from "../models/repositoryFacts";
import type { HealthReport } from "../models/healthReport";

function createReport(totalScore: number): HealthReport {
  return {
    owner: "acme",
    repo: "demo",
    totalScore,
    maxScore: 100,
    categories: [
      {
        categoryId: "documentation",
        categoryLabel: "Documentation",
        pointsAwarded: totalScore,
        maxPoints: 25,
        checks: [],
        recommendations: [],
      },
    ],
    recommendations: [],
    analyzedAt: "2026-01-01T00:00:00.000Z",
  };
}

function createFacts(pushedAt: string | null): RepositoryFacts {
  return {
    owner: "acme",
    name: "demo",
    defaultBranch: "main",
    description: null,
    homepage: null,
    visibility: "public",
    archived: false,
    fork: false,
    license: null,
    licenseFileExists: false,
    primaryLanguage: "TypeScript",
    languages: {},
    rootEntries: [],
    githubEntries: [],
    readme: { exists: true, path: "README.md", content: "# Demo" },
    dependencyFiles: [],
    workflowFiles: [],
    tree: { paths: [], truncated: false, skipped: false },
    activity: {
      pushedAt,
      updatedAt: null,
      openIssuesCount: 0,
      hasReleases: false,
    },
    fetchedAt: "2026-01-01T00:00:00.000Z",
    collectionWarnings: [],
  };
}

describe("health history", () => {
  it("suppresses duplicate snapshots when nothing meaningful changed", () => {
    const snapshot = createSnapshotFromReport(createFacts(null), createReport(75));

    expect(shouldRecordSnapshot({ snapshots: [snapshot], next: snapshot })).toBe(
      false,
    );
  });

  it("records when score changes", () => {
    const first = createSnapshotFromReport(createFacts(null), createReport(75));
    const second = createSnapshotFromReport(createFacts(null), createReport(80));

    expect(shouldRecordSnapshot({ snapshots: [first], next: second })).toBe(true);
  });

  it("caps history at 30 snapshots", () => {
    const snapshots = Array.from({ length: 30 }, (_value, index) =>
      createSnapshotFromReport(createFacts(null), createReport(index)),
    );
    const next = createSnapshotFromReport(createFacts(null), createReport(99));
    const updated = appendSnapshot(snapshots, next);

    expect(updated).toHaveLength(30);
    expect(updated.at(-1)?.totalScore).toBe(99);
  });

  it("calculates trend deltas", () => {
    const snapshots = [
      createSnapshotFromReport(createFacts(null), createReport(70)),
      createSnapshotFromReport(createFacts(null), createReport(75)),
    ];

    expect(calculateScoreTrend(snapshots)).toEqual({
      currentScore: 75,
      previousScore: 70,
      change: 5,
      snapshots,
    });
  });
});
