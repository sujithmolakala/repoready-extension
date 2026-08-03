import type { GitHubTreeEntry, GitHubTreeResponse } from "./types";

import { MAX_TREE_PATHS } from "./dependency-file-names";

export function parseTree(body: GitHubTreeResponse): {
  paths: string[];
  truncated: boolean;
} {
  const paths: string[] = [];

  if (Array.isArray(body.tree)) {
    for (const entry of body.tree as GitHubTreeEntry[]) {
      if (
        typeof entry.path === "string" &&
        entry.type === "blob"
      ) {
        paths.push(entry.path);
      }
    }
  }

  if (paths.length > MAX_TREE_PATHS) {
    return {
      paths: paths.slice(0, MAX_TREE_PATHS),
      truncated: true,
    };
  }

  return {
    paths,
    truncated: body.truncated === true,
  };
}
