import type { RepositoryFileContentStatus } from "./repositoryFileContent";

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
  size: number | null;
}

export interface RepositoryFile {
  path: string;
  name: string;
  size: number | null;
  content: string | null;
  contentStatus: RepositoryFileContentStatus;
}

export interface RepositoryFacts {
  owner: string;
  name: string;
  defaultBranch: string;
  description: string | null;
  homepage: string | null;
  visibility: "public" | "private" | "internal";
  archived: boolean;
  fork: boolean;

  license: {
    key: string;
    name: string;
    spdxId: string | null;
  } | null;
  licenseFileExists: boolean;

  primaryLanguage: string | null;
  languages: Record<string, number>;

  rootEntries: FileEntry[];
  githubEntries: FileEntry[];

  readme: {
    exists: boolean;
    path: string | null;
    content: string | null;
  };

  dependencyFiles: RepositoryFile[];
  workflowFiles: RepositoryFile[];

  tree: {
    paths: string[];
    truncated: boolean;
    skipped: boolean;
  };

  activity: {
    pushedAt: string | null;
    updatedAt: string | null;
    openIssuesCount: number;
    hasReleases: boolean;
  };

  fetchedAt: string;
  collectionWarnings: string[];
}

export interface RepositoryFactsState {
  repositoryKey: string | null;
  facts: RepositoryFacts | null;
  isLoading: boolean;
  error: string | null;
}

export const emptyRepositoryFactsState: RepositoryFactsState = {
  repositoryKey: null,
  facts: null,
  isLoading: false,
  error: null,
};

export function repositoryKey(owner: string, name: string): string {
  return `${owner}/${name}`;
}
