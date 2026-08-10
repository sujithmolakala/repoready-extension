import type { RepositoryFacts } from "../../domain/models/repositoryFacts";
import {
  appendSnapshot,
  createSnapshotFromReport,
  historyStorageKey,
  type HealthScoreSnapshot,
} from "../../domain/models/healthHistory";
import type { HealthReport } from "../../domain/models/healthReport";

export class HealthScoreHistoryStore {
  async loadSnapshots(owner: string, repo: string): Promise<HealthScoreSnapshot[]> {
    const key = historyStorageKey(owner, repo);
    const result = await chrome.storage.local.get(key);
    const value = result[key];

    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter(isHealthScoreSnapshot);
  }

  async recordAnalysis(
    facts: RepositoryFacts,
    report: HealthReport,
    options?: { force?: boolean },
  ): Promise<HealthScoreSnapshot[]> {
    const existing = await this.loadSnapshots(facts.owner, facts.name);
    const snapshot = createSnapshotFromReport(facts, report);
    const next = appendSnapshot(existing, snapshot, options?.force ?? false);
    const key = historyStorageKey(facts.owner, facts.name);

    if (next.length === existing.length) {
      return next;
    }

    await chrome.storage.local.set({ [key]: next });
    return next;
  }
}

function isHealthScoreSnapshot(value: unknown): value is HealthScoreSnapshot {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const snapshot = value as Record<string, unknown>;

  return (
    typeof snapshot.owner === "string" &&
    typeof snapshot.repo === "string" &&
    typeof snapshot.totalScore === "number" &&
    typeof snapshot.analyzedAt === "string" &&
    Array.isArray(snapshot.categoryScores)
  );
}
