import { describe, expect, it, vi } from "vitest";

import type { RepositoryFacts } from "../../domain/models/repositoryFacts";
import { MAX_REPOSITORY_FILE_CONTENT_BYTES } from "../../domain/models/repositoryFileContent";
import {
  detectDependencyPaths,
  FactCollector,
  hasLicenseFile,
} from "./FactCollector";
import type { GitHubClient } from "./GitHubClient";
import { MAX_TREE_PATHS } from "./dependency-file-names";
import { parseTree } from "./tree-parser";
import { containsTokenLikeValue } from "../../shared/format-facts-debug";

function createMockClient(
  overrides: Partial<GitHubClient> = {},
): GitHubClient {
  return {
    getRepository: vi.fn(async () => ({
      default_branch: "main",
      description: "A test repository",
      homepage: null,
      visibility: "public",
      private: false,
      archived: false,
      fork: false,
      license: null,
      language: "TypeScript",
      pushed_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
      open_issues_count: 3,
    })),
    getLanguages: vi.fn(async () => ({ TypeScript: 1200, JavaScript: 300 })),
    getDirectoryContents: vi.fn(async (_owner, _name, path) => {
      if (path === "") {
        return [
          { name: "package.json", path: "package.json", type: "file", size: 100 },
          {
            name: "package-lock.json",
            path: "package-lock.json",
            type: "file",
            size: 170251,
          },
          { name: "LICENSE", path: "LICENSE", type: "file", size: 50 },
          { name: "README.md", path: "README.md", type: "file", size: 100 },
        ];
      }

      if (path === ".github") {
        return [
          {
            name: "workflows",
            path: ".github/workflows",
            type: "dir",
            size: 0,
          },
        ];
      }

      if (path === ".github/workflows") {
        return [
          {
            name: "ci.yml",
            path: ".github/workflows/ci.yml",
            type: "file",
            size: 120,
          },
          {
            name: "README.md",
            path: ".github/workflows/README.md",
            type: "file",
            size: 40,
          },
          {
            name: "config",
            path: ".github/workflows/config",
            type: "dir",
            size: 0,
          },
        ];
      }

      return [];
    }),
    getFileContent: vi.fn(async (_owner, _name, path: string) => ({
      path,
      content: `content:${path}`,
      size: 10,
    })),
    getReadme: vi.fn(async () => ({
      path: "README.md",
      content: "# Hello",
    })),
    getRecursiveTree: vi.fn(async () => ({
      paths: ["README.md", "package.json", "src/index.ts"],
      truncated: false,
    })),
    hasReleases: vi.fn(async () => true),
    ...overrides,
  } as unknown as GitHubClient;
}

describe("FactCollector", () => {
  it("stores package.json content when under the limit", async () => {
    const collector = new FactCollector(createMockClient());

    const facts = await collector.collect("RepoReady", "repoready");

    expect(facts.dependencyFiles).toContainEqual({
      path: "package.json",
      name: "package.json",
      size: 10,
      content: "content:package.json",
      contentStatus: "loaded",
    });
  });

  it("does not store package-lock.json content", async () => {
    const getFileContent = vi.fn(async (_owner, _name, path: string) => ({
      path,
      content: `content:${path}`,
      size: 10,
    }));
    const collector = new FactCollector(
      createMockClient({ getFileContent }),
    );

    const facts = await collector.collect("RepoReady", "repoready");

    expect(getFileContent).not.toHaveBeenCalledWith(
      "RepoReady",
      "repoready",
      "package-lock.json",
    );
    expect(facts.dependencyFiles).toContainEqual({
      path: "package-lock.json",
      name: "package-lock.json",
      size: 170251,
      content: null,
      contentStatus: "skipped-lockfile",
    });
  });

  it("fetches multiple manifest files in parallel", async () => {
    const getFileContent = vi.fn(async (_owner, _name, path: string) => ({
      path,
      content: `content:${path}`,
      size: 10,
    }));
    const collector = new FactCollector(
      createMockClient({ getFileContent }),
    );

    await collector.collect("RepoReady", "repoready");

    expect(getFileContent).toHaveBeenCalledWith(
      "RepoReady",
      "repoready",
      "package.json",
    );
  });

  it("marks oversized package.json as skipped-too-large", async () => {
    const oversizedContent = "a".repeat(MAX_REPOSITORY_FILE_CONTENT_BYTES + 1);
    const collector = new FactCollector(
      createMockClient({
        getFileContent: vi.fn(async (_owner, _name, path: string) => ({
          path,
          content: oversizedContent,
          size: oversizedContent.length,
        })),
      }),
    );

    const facts = await collector.collect("RepoReady", "repoready");

    expect(facts.dependencyFiles).toContainEqual({
      path: "package.json",
      name: "package.json",
      size: oversizedContent.length,
      content: null,
      contentStatus: "skipped-too-large",
    });
  });

  it("marks oversized workflow files as skipped-too-large", async () => {
    const oversizedContent = "a".repeat(MAX_REPOSITORY_FILE_CONTENT_BYTES + 1);
    const collector = new FactCollector(
      createMockClient({
        getFileContent: vi.fn(async (_owner, _name, path: string) => ({
          path,
          content: oversizedContent,
          size: oversizedContent.length,
        })),
      }),
    );

    const facts = await collector.collect("yc-software", "qm");

    expect(facts.workflowFiles).toEqual([
      {
        path: ".github/workflows/ci.yml",
        name: "ci.yml",
        size: oversizedContent.length,
        content: null,
        contentStatus: "skipped-too-large",
      },
    ]);
  });

  it("continues collection when one file is too large", async () => {
    const oversizedContent = "a".repeat(MAX_REPOSITORY_FILE_CONTENT_BYTES + 1);
    const collector = new FactCollector(
      createMockClient({
        getFileContent: vi.fn(async (_owner, _name, path: string) => ({
          path,
          content:
            path === "package.json" ? oversizedContent : `content:${path}`,
          size: 10,
        })),
      }),
    );

    const facts = await collector.collect("RepoReady", "repoready");

    expect(facts.dependencyFiles).toHaveLength(2);
    expect(facts.collectionWarnings).toEqual([]);
    expect(containsTokenLikeValue(facts)).toBe(false);
  });

  it("lists and stores workflow metadata without oversized content", async () => {
    const collector = new FactCollector(createMockClient());

    const facts = await collector.collect("yc-software", "qm");

    expect(facts.workflowFiles).toEqual([
      {
        path: ".github/workflows/ci.yml",
        name: "ci.yml",
        size: 10,
        content: "content:.github/workflows/ci.yml",
        contentStatus: "loaded",
      },
    ]);
  });

  it("records LICENSE file existence when metadata license is null", async () => {
    const collector = new FactCollector(createMockClient());

    const facts: RepositoryFacts = await collector.collect("RepoReady", "repoready");

    expect(facts.license).toBeNull();
    expect(facts.licenseFileExists).toBe(true);
  });

  it("marks tree collection as skipped when recursive tree fetch fails", async () => {
    const collector = new FactCollector(
      createMockClient({
        getRecursiveTree: vi.fn(async () => {
          throw new Error("tree unavailable");
        }),
      }),
    );

    const facts = await collector.collect("facebook", "react");

    expect(facts.tree).toEqual({
      paths: [],
      truncated: false,
      skipped: true,
    });
    expect(facts.dependencyFiles.length).toBeGreaterThan(0);
  });

  it("continues fact collection when an optional manifest file fails", async () => {
    const getFileContent = vi.fn(async (_owner, _name, path: string) => {
      if (path === "package.json") {
        throw new Error("missing");
      }

      return {
        path,
        content: `content:${path}`,
        size: 10,
      };
    });

    const collector = new FactCollector(
      createMockClient({ getFileContent }),
    );

    const facts = await collector.collect("RepoReady", "repoready");

    expect(facts.dependencyFiles).toEqual([
      {
        path: "package-lock.json",
        name: "package-lock.json",
        size: 170251,
        content: null,
        contentStatus: "skipped-lockfile",
      },
    ]);
    expect(facts.collectionWarnings).toContain(
      "Failed to fetch dependency file: package.json",
    );
  });

  it("continues fact collection when an optional workflow file fails", async () => {
    const getFileContent = vi.fn(async (_owner, _name, path: string) => {
      if (path === ".github/workflows/ci.yml") {
        throw new Error("missing");
      }

      return {
        path,
        content: `content:${path}`,
        size: 10,
      };
    });

    const collector = new FactCollector(
      createMockClient({ getFileContent }),
    );

    const facts = await collector.collect("yc-software", "qm");

    expect(facts.workflowFiles).toEqual([]);
    expect(facts.collectionWarnings).toContain(
      "Failed to fetch workflow file: .github/workflows/ci.yml",
    );
  });

  it("ignores unrelated files inside the workflows directory", async () => {
    const collector = new FactCollector(createMockClient());

    const facts = await collector.collect("yc-software", "qm");

    expect(facts.workflowFiles.map((file) => file.name)).toEqual(["ci.yml"]);
  });

  it("returns empty workflow files when the workflows directory is missing", async () => {
    const collector = new FactCollector(
      createMockClient({
        getDirectoryContents: vi.fn(async (_owner, _name, path) => {
          if (path === "") {
            return [
              {
                name: "package.json",
                path: "package.json",
                type: "file",
                size: 100,
              },
            ];
          }

          return [];
        }),
      }),
    );

    const facts = await collector.collect("owner", "repo");

    expect(facts.workflowFiles).toEqual([]);
  });

  it("sets tree.skipped to false on successful tree collection", async () => {
    const collector = new FactCollector(createMockClient());

    const facts = await collector.collect("RepoReady", "repoready");

    expect(facts.tree).toEqual({
      paths: ["README.md", "package.json", "src/index.ts"],
      truncated: false,
      skipped: false,
    });
  });

  it("matches dependency filenames case-sensitively", () => {
    expect(
      detectDependencyPaths(
        [
          {
            name: "Package.json",
            path: "Package.json",
            type: "file",
            size: 1,
          },
          {
            name: "package.json",
            path: "package.json",
            type: "file",
            size: 1,
          },
        ],
        [],
      ),
    ).toEqual(["package.json"]);
  });

  it("deduplicates dependency paths detected from root and tree", () => {
    expect(
      detectDependencyPaths(
        [
          {
            name: "package.json",
            path: "package.json",
            type: "file",
            size: 1,
          },
        ],
        ["package.json", "services/api/package.json"],
      ),
    ).toEqual(["package.json", "services/api/package.json"]);
  });
});

describe("hasLicenseFile", () => {
  it("detects LICENSE in root entries", () => {
    expect(
      hasLicenseFile([
        { name: "LICENSE", path: "LICENSE", type: "file", size: 1 },
      ]),
    ).toBe(true);
  });
});

describe("parseTree", () => {
  it("caps paths at 2000 and marks truncated", () => {
    const tree = Array.from({ length: MAX_TREE_PATHS + 10 }, (_value, index) => ({
      path: `file-${String(index)}.txt`,
      type: "blob",
    }));

    const result = parseTree({ tree, truncated: false });

    expect(result.paths).toHaveLength(MAX_TREE_PATHS);
    expect(result.truncated).toBe(true);
  });

  it("preserves GitHub truncated flag", () => {
    const result = parseTree({
      tree: [{ path: "README.md", type: "blob" }],
      truncated: true,
    });

    expect(result.truncated).toBe(true);
  });
});
