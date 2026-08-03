export type RepositoryFileContentStatus =
  | "loaded"
  | "skipped-lockfile"
  | "skipped-too-large"
  | "unavailable";

/** Maximum decoded text stored for manifests, lockfile metadata fetches, and workflows. */
export const MAX_REPOSITORY_FILE_CONTENT_BYTES = 100 * 1024;

/** Maximum decoded README text stored in RepositoryFacts. */
export const MAX_README_CONTENT_BYTES = 256 * 1024;

/** Maximum characters shown in the side panel debug preview for loaded file content. */
export const DEBUG_CONTENT_PREVIEW_CHARS = 500;
