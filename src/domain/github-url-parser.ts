import type { GitHubRepository } from "./repository";

const RESERVED_ROOT_SEGMENTS = new Set([
  "settings",
  "notifications",
  "explore",
  "marketplace",
]);

const NON_REPO_PREFIXES = new Set([
  "orgs",
  "organizations",
  "apps",
  "new",
]);

const PROFILE_SUBPAGES = new Set([
  "followers",
  "following",
  "repositories",
  "projects",
  "packages",
  "stars",
  "sponsoring",
  "achievements",
]);

const GITHUB_SLUG_PATTERN = /^[a-zA-Z0-9._-]+$/;

function isGitHubSlug(value: string): boolean {
  return GITHUB_SLUG_PATTERN.test(value);
}

export function parseGitHubRepositoryUrl(url: string): GitHubRepository | null {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.hostname !== "github.com") {
    return null;
  }

  const segments = parsed.pathname
    .split("/")
    .filter((segment) => segment.length > 0);

  if (segments.length < 2) {
    return null;
  }

  const [owner, name] = segments;

  if (NON_REPO_PREFIXES.has(owner.toLowerCase())) {
    return null;
  }

  if (RESERVED_ROOT_SEGMENTS.has(owner.toLowerCase())) {
    return null;
  }

  if (PROFILE_SUBPAGES.has(name.toLowerCase())) {
    return null;
  }

  if (!isGitHubSlug(owner) || !isGitHubSlug(name)) {
    return null;
  }

  return { owner, name };
}
