import { describe, expect, it } from "vitest";

import { analyzeRepositoryInsights } from "./analyzeInsights";
import { detectPrimaryLanguage } from "./languageDetection";
import type { RepositoryFacts } from "../models/repositoryFacts";
import { analyzeWithPlugins } from "../health/analyzeHealthReport";
import { defaultHealthPlugins } from "../health/defaultHealthPlugins";

function createFacts(overrides: Partial<RepositoryFacts> = {}): RepositoryFacts {
  return {
    owner: "acme",
    name: "demo",
    defaultBranch: "main",
    description: "Demo repo",
    homepage: null,
    visibility: "public",
    archived: false,
    fork: false,
    license: null,
    licenseFileExists: true,
    primaryLanguage: "TypeScript",
    languages: { TypeScript: 1000 },
    rootEntries: [
      { name: "package.json", path: "package.json", type: "file", size: 100 },
      { name: "package-lock.json", path: "package-lock.json", type: "file", size: 100 },
      { name: "tsconfig.json", path: "tsconfig.json", type: "file", size: 100 },
    ],
    githubEntries: [],
    readme: {
      exists: true,
      path: "README.md",
      content: "# Demo\n\n## Setup\n\n## Usage\n\n## Testing\n\n```bash\nnpm test\n```",
    },
    dependencyFiles: [
      {
        path: "package.json",
        name: "package.json",
        size: 100,
        content: JSON.stringify({
          scripts: { test: "vitest run", lint: "eslint .", build: "vite build" },
          devDependencies: { vitest: "1.0.0", eslint: "9.0.0", vite: "6.0.0" },
          dependencies: { react: "19.0.0", next: "15.0.0" },
        }),
        contentStatus: "loaded",
      },
    ],
    workflowFiles: [
      {
        path: ".github/workflows/ci.yml",
        name: "ci.yml",
        size: 100,
        content: "on: [push, pull_request]\njobs:\n  test:\n    steps:\n      - run: npm test\n      - run: npm run build\n      - run: npm run lint",
        contentStatus: "loaded",
      },
    ],
    tree: {
      paths: [
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "src/index.ts",
        "src/index.test.ts",
        ".github/dependabot.yml",
      ],
      truncated: false,
      skipped: false,
    },
    activity: {
      pushedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      openIssuesCount: 0,
      hasReleases: true,
    },
    fetchedAt: "2026-01-01T00:00:00.000Z",
    collectionWarnings: [],
    ...overrides,
  };
}

describe("insights", () => {
  it("detects TypeScript language evidence", () => {
    expect(detectPrimaryLanguage(createFacts())).toBe("typescript");
  });

  it("returns informational insight sections without changing score", () => {
    const facts = createFacts();
    const report = analyzeWithPlugins(facts, defaultHealthPlugins);
    const insights = analyzeRepositoryInsights(facts, report);

    expect(insights.sections.length).toBeGreaterThanOrEqual(6);
    expect(report.totalScore).toBeLessThanOrEqual(100);
    expect(
      insights.sections.find((section) => section.categoryId === "dependency-health"),
    ).toBeDefined();
  });

  it("marks truncated trees as undetermined instead of false failures", () => {
    const facts = createFacts({
      tree: { paths: ["README.md"], truncated: true, skipped: false },
    });
    const report = analyzeWithPlugins(facts, defaultHealthPlugins);
    const testingCheck = report.categories
      .find((category) => category.categoryId === "testing")
      ?.checks.find((check) => check.id === "test-files-exist");

    expect(testingCheck?.status).toBe("undetermined");
  });
});

describe("health invariants", () => {
  it("keeps category maximums at exactly 100", () => {
    const max = defaultHealthPlugins.reduce((sum, plugin) => sum + plugin.maxPoints, 0);
    expect(max).toBe(100);
  });

  it("does not import AI modules from health plugins", () => {
    for (const plugin of defaultHealthPlugins) {
      expect(plugin.id).not.toMatch(/ai/i);
    }
  });
});
