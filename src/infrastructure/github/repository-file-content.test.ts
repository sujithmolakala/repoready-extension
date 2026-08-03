import { describe, expect, it } from "vitest";

import {
  applyReadmeContentPolicy,
  applyRepositoryFileContentPolicy,
  createSkippedLockfileRecord,
  measureUtf8Bytes,
} from "./repository-file-content";
import {
  MAX_README_CONTENT_BYTES,
  MAX_REPOSITORY_FILE_CONTENT_BYTES,
} from "../../domain/models/repositoryFileContent";

describe("applyRepositoryFileContentPolicy", () => {
  it("stores manifest content when under the limit", () => {
    expect(
      applyRepositoryFileContentPolicy("package.json", '{"name":"demo"}'),
    ).toEqual({
      content: '{"name":"demo"}',
      contentStatus: "loaded",
    });
  });

  it("does not store lockfile content", () => {
    expect(
      applyRepositoryFileContentPolicy(
        "package-lock.json",
        '{"lockfileVersion":3}',
      ),
    ).toEqual(createSkippedLockfileRecord());
  });

  it("marks oversized manifests as skipped-too-large", () => {
    const oversizedContent = "a".repeat(MAX_REPOSITORY_FILE_CONTENT_BYTES + 1);

    expect(
      applyRepositoryFileContentPolicy("package.json", oversizedContent),
    ).toEqual({
      content: null,
      contentStatus: "skipped-too-large",
    });
  });

  it("marks oversized workflows as skipped-too-large", () => {
    const oversizedContent = "a".repeat(MAX_REPOSITORY_FILE_CONTENT_BYTES + 1);

    expect(
      applyRepositoryFileContentPolicy("ci.yml", oversizedContent),
    ).toEqual({
      content: null,
      contentStatus: "skipped-too-large",
    });
  });
});

describe("applyReadmeContentPolicy", () => {
  it("stores README content under the readme limit", () => {
    expect(applyReadmeContentPolicy("# Hello")).toBe("# Hello");
  });

  it("drops README content above the readme limit", () => {
    const oversizedReadme = "a".repeat(MAX_README_CONTENT_BYTES + 1);

    expect(applyReadmeContentPolicy(oversizedReadme)).toBeNull();
  });
});

describe("measureUtf8Bytes", () => {
  it("counts multibyte characters", () => {
    expect(measureUtf8Bytes("café")).toBeGreaterThan(4);
  });
});
