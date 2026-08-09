import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { analyzeWithPlugins } from "../health/analyzeHealthReport";
import { defaultHealthPlugins } from "../health/defaultHealthPlugins";
import type { RepositoryFacts } from "../models/repositoryFacts";

function createFacts(): RepositoryFacts {
  return {
    owner: "cursor",
    name: "repoready",
    defaultBranch: "main",
    description: "Analyze GitHub repository health",
    homepage: null,
    visibility: "public",
    archived: false,
    fork: false,
    license: { key: "mit", name: "MIT License", spdxId: "MIT" },
    licenseFileExists: true,
    primaryLanguage: "TypeScript",
    languages: { TypeScript: 100 },
    rootEntries: [],
    githubEntries: [],
    readme: { exists: true, path: "README.md", content: "# RepoReady" },
    dependencyFiles: [
      {
        path: "package.json",
        name: "package.json",
        size: 100,
        content: '{"scripts":{"test":"vitest run"}}',
        contentStatus: "loaded",
      },
    ],
    workflowFiles: [
      {
        path: ".github/workflows/ci.yml",
        name: "ci.yml",
        size: 100,
        content: "name: CI\non: push",
        contentStatus: "loaded",
      },
    ],
    tree: {
      paths: [
        "README.md",
        "package.json",
        ".github/workflows/ci.yml",
        "src/index.ts",
      ],
      truncated: false,
      skipped: false,
    },
    activity: {
      pushedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      openIssuesCount: 0,
      hasReleases: false,
    },
    fetchedAt: "2026-01-01T00:00:00.000Z",
    collectionWarnings: [],
  };
}

describe("AI integration boundaries", () => {
  it("keeps health score plugins free of AI imports", () => {
    const pluginPaths = [
      "src/domain/health/plugins/documentationPlugin.ts",
      "src/domain/health/plugins/communityStandardsPlugin.ts",
      "src/domain/health/plugins/projectStructurePlugin.ts",
      "src/domain/health/plugins/testingPlugin.ts",
      "src/domain/health/plugins/ciCdPlugin.ts",
      "src/domain/health/plugins/securityPlugin.ts",
    ];

    for (const pluginPath of pluginPaths) {
      const source = String(readFileSync(pluginPath, "utf8"));
      expect(source.includes("/ai/")).toBe(false);
      expect(source.includes("OpenAI")).toBe(false);
      expect(source.includes("AIProvider")).toBe(false);
    }
  });

  it("produces identical health score output before and after AI integration", () => {
    const facts = createFacts();
    const report = analyzeWithPlugins(facts, defaultHealthPlugins, {
      analyzedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(report.totalScore).toBeGreaterThan(0);
    expect(report.maxScore).toBe(100);
    expect(report.categories.length).toBe(6);
  });
});
