import {
  detectInstallCommand,
  detectPackageManager,
  detectTestCommand,
} from "../documents/repository-fact-helpers";
import type { RepositoryFacts } from "../models/repositoryFacts";

export const AI_FACTS_LIMITS = {
  readmeExcerptMaxChars: 2_000,
  workflowExcerptMaxChars: 500,
  maxWorkflowExcerpts: 3,
  manifestExcerptMaxChars: 500,
  maxManifestExcerpts: 2,
  maxRelevantPaths: 40,
  maxTotalPayloadChars: 8_000,
} as const;

export interface AIFactsPayload {
  owner: string;
  repo: string;
  description: string | null;
  primaryLanguage: string | null;
  packageManager: string | null;
  installCommand: string | null;
  testCommand: string | null;
  licenseName: string | null;
  readmeExcerpt: string | null;
  relevantPaths: string[];
  hasTests: boolean;
  hasCi: boolean;
  workflowSummaries: string[];
  manifestExcerpts: string[];
  truncated: boolean;
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}\n… [truncated]`;
}

function hasCiWorkflows(facts: RepositoryFacts): boolean {
  return facts.workflowFiles.length > 0;
}

function hasDetectedTests(facts: RepositoryFacts): boolean {
  return detectTestCommand(facts) !== null;
}

function buildWorkflowSummaries(facts: RepositoryFacts): string[] {
  const summaries: string[] = [];

  for (const workflow of facts.workflowFiles.slice(
    0,
    AI_FACTS_LIMITS.maxWorkflowExcerpts,
  )) {
    if (workflow.content === null) {
      summaries.push(`${workflow.path}: (content unavailable)`);
      continue;
    }

    summaries.push(
      `${workflow.path}:\n${truncateText(
        workflow.content,
        AI_FACTS_LIMITS.workflowExcerptMaxChars,
      )}`,
    );
  }

  return summaries;
}

function buildManifestExcerpts(facts: RepositoryFacts): string[] {
  const excerpts: string[] = [];

  for (const file of facts.dependencyFiles.slice(
    0,
    AI_FACTS_LIMITS.maxManifestExcerpts,
  )) {
    if (file.content === null) {
      continue;
    }

    const isLockfile =
      file.path.endsWith("package-lock.json") ||
      file.path.endsWith("yarn.lock") ||
      file.path.endsWith("pnpm-lock.yaml");

    if (isLockfile) {
      excerpts.push(`${file.path}: (lockfile omitted)`);
      continue;
    }

    excerpts.push(
      `${file.path}:\n${truncateText(
        file.content,
        AI_FACTS_LIMITS.manifestExcerptMaxChars,
      )}`,
    );
  }

  return excerpts;
}

function buildRelevantPaths(facts: RepositoryFacts): string[] {
  const priorityPrefixes = [
    "CONTRIBUTING",
    "CODE_OF_CONDUCT",
    "SECURITY",
    "CHANGELOG",
    ".github/",
    "docs/",
    "test",
    "src/",
  ];

  const paths = facts.tree.paths.filter((path) => {
    const lower = path.toLowerCase();
    return priorityPrefixes.some((prefix) => lower.includes(prefix.toLowerCase()));
  });

  const capped = paths.slice(0, AI_FACTS_LIMITS.maxRelevantPaths);
  const truncated =
    paths.length > AI_FACTS_LIMITS.maxRelevantPaths ||
    facts.tree.truncated ||
    facts.tree.skipped;

  if (truncated && capped.length > 0) {
    return [...capped, "… (path list truncated)"];
  }

  return capped;
}

export function buildAIFactsPayload(facts: RepositoryFacts): AIFactsPayload {
  const readmeExcerpt =
    facts.readme.content !== null
      ? truncateText(
          facts.readme.content,
          AI_FACTS_LIMITS.readmeExcerptMaxChars,
        )
      : null;

  const payload: AIFactsPayload = {
    owner: facts.owner,
    repo: facts.name,
    description: facts.description,
    primaryLanguage: facts.primaryLanguage,
    packageManager: detectPackageManager(facts),
    installCommand: detectInstallCommand(facts),
    testCommand: detectTestCommand(facts),
    licenseName: facts.license?.name ?? null,
    readmeExcerpt,
    relevantPaths: buildRelevantPaths(facts),
    hasTests: hasDetectedTests(facts),
    hasCi: hasCiWorkflows(facts),
    workflowSummaries: buildWorkflowSummaries(facts),
    manifestExcerpts: buildManifestExcerpts(facts),
    truncated:
      facts.tree.truncated ||
      facts.tree.skipped ||
      (facts.readme.content !== null &&
        facts.readme.content.length > AI_FACTS_LIMITS.readmeExcerptMaxChars),
  };

  let serialized = JSON.stringify(payload);

  if (serialized.length > AI_FACTS_LIMITS.maxTotalPayloadChars) {
    payload.readmeExcerpt =
      payload.readmeExcerpt !== null
        ? truncateText(payload.readmeExcerpt, 800)
        : null;
    payload.workflowSummaries = payload.workflowSummaries.slice(0, 1);
    payload.manifestExcerpts = payload.manifestExcerpts.slice(0, 1);
    payload.relevantPaths = payload.relevantPaths.slice(0, 15);
    payload.truncated = true;
    serialized = JSON.stringify(payload);
  }

  return payload;
}

export function serializeAIFactsPayload(payload: AIFactsPayload): string {
  return JSON.stringify(payload, null, 2);
}
