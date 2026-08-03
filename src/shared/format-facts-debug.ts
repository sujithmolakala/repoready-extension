import { DEBUG_CONTENT_PREVIEW_CHARS } from "../domain/models/repositoryFileContent";
import type {
  RepositoryFacts,
  RepositoryFile,
} from "../domain/models/repositoryFacts";

export interface DebugRepositoryFileSummary {
  path: string;
  name: string;
  size: number | null;
  contentStatus: RepositoryFile["contentStatus"];
  preview?: string;
}

export interface DebugRepositoryFactsView {
  owner: string;
  name: string;
  defaultBranch: string;
  description: string | null;
  homepage: string | null;
  visibility: RepositoryFacts["visibility"];
  archived: boolean;
  fork: boolean;
  license: RepositoryFacts["license"];
  licenseFileExists: boolean;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  rootEntries: RepositoryFacts["rootEntries"];
  githubEntries: RepositoryFacts["githubEntries"];
  readme: {
    exists: boolean;
    path: string | null;
    preview: string | null;
  };
  dependencyFiles: DebugRepositoryFileSummary[];
  workflowFiles: DebugRepositoryFileSummary[];
  tree: RepositoryFacts["tree"];
  activity: RepositoryFacts["activity"];
  fetchedAt: string;
  collectionWarnings: string[];
  approximateCacheSizeBytes: number;
}

export function summarizeRepositoryFileForDebug(
  file: RepositoryFile,
): DebugRepositoryFileSummary {
  const summary: DebugRepositoryFileSummary = {
    path: file.path,
    name: file.name,
    size: file.size,
    contentStatus: file.contentStatus,
  };

  if (file.contentStatus === "loaded" && file.content !== null) {
    summary.preview = truncatePreview(file.content);
  }

  return summary;
}

export function formatRepositoryFactsForDebug(
  facts: RepositoryFacts,
): DebugRepositoryFactsView {
  return {
    owner: facts.owner,
    name: facts.name,
    defaultBranch: facts.defaultBranch,
    description: facts.description,
    homepage: facts.homepage,
    visibility: facts.visibility,
    archived: facts.archived,
    fork: facts.fork,
    license: facts.license,
    licenseFileExists: facts.licenseFileExists,
    primaryLanguage: facts.primaryLanguage,
    languages: facts.languages,
    rootEntries: facts.rootEntries,
    githubEntries: facts.githubEntries,
    readme: {
      exists: facts.readme.exists,
      path: facts.readme.path,
      preview:
        facts.readme.content === null
          ? null
          : truncatePreview(facts.readme.content),
    },
    dependencyFiles: facts.dependencyFiles.map(summarizeRepositoryFileForDebug),
    workflowFiles: facts.workflowFiles.map(summarizeRepositoryFileForDebug),
    tree: facts.tree,
    activity: facts.activity,
    fetchedAt: facts.fetchedAt,
    collectionWarnings: facts.collectionWarnings,
    approximateCacheSizeBytes: estimateSerializedFactsBytes(facts),
  };
}

export function estimateSerializedFactsBytes(facts: RepositoryFacts): number {
  return measureUtf8Bytes(JSON.stringify(facts));
}

export function containsTokenLikeValue(value: unknown): boolean {
  if (typeof value === "string") {
    return /github_pat_|gh[pousr]_[A-Za-z0-9_]+/i.test(value);
  }

  if (Array.isArray(value)) {
    return value.some((entry) => containsTokenLikeValue(entry));
  }

  if (typeof value === "object" && value !== null) {
    return Object.values(value).some((entry) => containsTokenLikeValue(entry));
  }

  return false;
}

function truncatePreview(content: string): string {
  if (content.length <= DEBUG_CONTENT_PREVIEW_CHARS) {
    return content;
  }

  return `${content.slice(0, DEBUG_CONTENT_PREVIEW_CHARS)}…`;
}

function measureUtf8Bytes(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}
