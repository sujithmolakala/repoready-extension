import type { RepositoryFacts } from "../models/repositoryFacts";
import type { InsightItem } from "./types";

export function analyzeReleaseInsights(facts: RepositoryFacts): InsightItem[] {
  const hasChangelog = facts.tree.paths.some((path) =>
    ["CHANGELOG.md", "CHANGELOG", "CHANGES.md", "HISTORY.md"].includes(
      path.split("/").at(-1) ?? "",
    ),
  );

  return [
    {
      id: "release-exists",
      categoryId: "release",
      label: "GitHub releases detected",
      status: facts.activity.hasReleases ? "passed" : "undetermined",
      explanation: facts.activity.hasReleases
        ? "At least one GitHub release exists for this repository."
        : "No GitHub releases were detected (this may be normal for early projects).",
    },
    {
      id: "release-changelog",
      categoryId: "release",
      label: "Changelog present",
      status: hasChangelog ? "passed" : "failed",
      explanation: hasChangelog
        ? "A recognized changelog file exists in the repository."
        : "No CHANGELOG or equivalent file was detected.",
    },
    {
      id: "release-last-push",
      categoryId: "release",
      label: "Recent activity",
      status: facts.activity.pushedAt !== null ? "passed" : "undetermined",
      explanation:
        facts.activity.pushedAt !== null
          ? `Last push recorded at ${facts.activity.pushedAt}.`
          : "Last push date was unavailable.",
    },
    {
      id: "release-archived",
      categoryId: "release",
      label: "Repository archived status",
      status: facts.archived ? "failed" : "passed",
      explanation: facts.archived
        ? "This repository is marked as archived on GitHub."
        : "Repository is not archived.",
    },
  ];
}
