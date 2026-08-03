export interface GitHubUser {
  login: string;
  avatarUrl: string | null;
}

export interface GitHubUserResponse {
  login?: unknown;
  avatar_url?: unknown;
}

export interface GitHubRepositoryResponse {
  default_branch?: unknown;
  description?: unknown;
  homepage?: unknown;
  visibility?: unknown;
  private?: unknown;
  archived?: unknown;
  fork?: unknown;
  license?: unknown;
  language?: unknown;
  pushed_at?: unknown;
  updated_at?: unknown;
  open_issues_count?: unknown;
}

export interface GitHubContentResponse {
  name?: unknown;
  path?: unknown;
  type?: unknown;
  size?: unknown;
  content?: unknown;
  encoding?: unknown;
}

export interface GitHubReadmeResponse {
  path?: unknown;
  content?: unknown;
  encoding?: unknown;
}

export interface GitHubTreeResponse {
  tree?: unknown;
  truncated?: unknown;
}

export interface GitHubTreeEntry {
  path?: unknown;
  type?: unknown;
}

export interface GitHubBranchResponse {
  commit?: {
    sha?: unknown;
  };
}

export interface GitHubCommitResponse {
  tree?: {
    sha?: unknown;
  };
  commit?: {
    tree?: {
      sha?: unknown;
    };
  };
}

export interface GitHubReleaseResponse {
  id?: unknown;
}
