import type { RepositoryFileContentStatus } from "../../domain/models/repositoryFileContent";
import {
  MAX_README_CONTENT_BYTES,
  MAX_REPOSITORY_FILE_CONTENT_BYTES,
} from "../../domain/models/repositoryFileContent";
import { isLockfileName } from "./dependency-file-names";

export interface StoredFileContent {
  content: string | null;
  contentStatus: RepositoryFileContentStatus;
}

export function measureUtf8Bytes(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

export function applyRepositoryFileContentPolicy(
  fileName: string,
  decodedContent: string,
): StoredFileContent {
  if (isLockfileName(fileName)) {
    return {
      content: null,
      contentStatus: "skipped-lockfile",
    };
  }

  if (measureUtf8Bytes(decodedContent) > MAX_REPOSITORY_FILE_CONTENT_BYTES) {
    return {
      content: null,
      contentStatus: "skipped-too-large",
    };
  }

  return {
    content: decodedContent,
    contentStatus: "loaded",
  };
}

export function createSkippedLockfileRecord(): StoredFileContent {
  return {
    content: null,
    contentStatus: "skipped-lockfile",
  };
}

export function createUnavailableFileRecord(): StoredFileContent {
  return {
    content: null,
    contentStatus: "unavailable",
  };
}

export function applyReadmeContentPolicy(content: string): string | null {
  if (measureUtf8Bytes(content) > MAX_README_CONTENT_BYTES) {
    return null;
  }

  return content;
}
