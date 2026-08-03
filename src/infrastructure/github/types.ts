export interface GitHubUser {
  login: string;
  avatarUrl: string | null;
}

export interface GitHubUserResponse {
  login?: unknown;
  avatar_url?: unknown;
}
