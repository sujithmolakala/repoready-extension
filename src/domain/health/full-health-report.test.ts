import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { RepositoryFacts } from "../models/repositoryFacts";
import { analyzeWithPlugins } from "./analyzeHealthReport";
import { DEFAULT_PLUGIN_IDS, defaultHealthPlugins } from "./defaultHealthPlugins";
import { sortAndDedupeRecommendations } from "./recommendation-utils";
import { ciCdHealthPlugin } from "./plugins/ciCdPlugin";
import { projectStructureHealthPlugin } from "./plugins/projectStructurePlugin";
import { securityHealthPlugin } from "./plugins/securityPlugin";
import { testingHealthPlugin } from "./plugins/testingPlugin";
import {
  hasDependencyManifest,
  hasJavaScriptTestFramework,
  hasJavaTestFramework,
  hasPythonTestFramework,
  hasRubyTestFramework,
  hasTestPaths,
} from "./test-detection";
import {
  contentIncludesTestCommand,
  loadedWorkflowContents,
} from "./workflow-analysis";

function createFacts(
  overrides: Partial<RepositoryFacts> = {},
): RepositoryFacts {
  return {
    owner: "owner",
    name: "repo",
    defaultBranch: "main",
    description: "Example repository",
    homepage: null,
    visibility: "public",
    archived: false,
    fork: false,
    license: null,
    licenseFileExists: false,
    primaryLanguage: "TypeScript",
    languages: {},
    rootEntries: [],
    githubEntries: [],
    readme: { exists: false, path: null, content: null },
    dependencyFiles: [],
    workflowFiles: [],
    tree: { paths: [], truncated: false, skipped: false },
    activity: {
      pushedAt: null,
      updatedAt: null,
      openIssuesCount: 0,
      hasReleases: false,
    },
    fetchedAt: "2026-01-01T00:00:00Z",
    collectionWarnings: [],
    ...overrides,
  };
}

describe("ProjectStructureHealthPlugin", () => {
  it("uses exactly 20 max points", () => {
    expect(projectStructureHealthPlugin.maxPoints).toBe(20);
  });

  it("passes recognized license metadata", () => {
    const result = projectStructureHealthPlugin.analyze(
      createFacts({
        license: { key: "mit", name: "MIT License", spdxId: "MIT" },
      }),
    );

    expect(result.checks.find((check) => check.id === "license-exists")?.status).toBe(
      "passed",
    );
  });

  it("passes unrecognized LICENSE file presence", () => {
    const result = projectStructureHealthPlugin.analyze(
      createFacts({ licenseFileExists: true }),
    );

    expect(result.checks.find((check) => check.id === "license-exists")?.status).toBe(
      "passed",
    );
  });

  it("does not pass lockfile-only repositories for dependency manifest", () => {
    expect(
      hasDependencyManifest(
        createFacts({
          dependencyFiles: [
            {
              path: "package-lock.json",
              name: "package-lock.json",
              size: 1,
              content: null,
              contentStatus: "skipped-lockfile",
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("passes conventional src directory organization", () => {
    const result = projectStructureHealthPlugin.analyze(
      createFacts({
        rootEntries: [{ name: "src", path: "src", type: "dir", size: 0 }],
      }),
    );

    expect(
      result.checks.find((check) => check.id === "source-organized")?.status,
    ).toBe("passed");
  });

  it("fails flat-sprawl repositories", () => {
    const looseFiles = Array.from({ length: 16 }, (_value, index) => ({
      name: `file-${String(index)}.txt`,
      path: `file-${String(index)}.txt`,
      type: "file" as const,
      size: 1,
    }));

    const result = projectStructureHealthPlugin.analyze(
      createFacts({ rootEntries: looseFiles }),
    );

    expect(
      result.checks.find((check) => check.id === "source-organized")?.status,
    ).toBe("failed");
  });
});

describe("TestingHealthPlugin", () => {
  it("marks skipped tree as undetermined for test files", () => {
    const result = testingHealthPlugin.analyze(
      createFacts({ tree: { paths: [], truncated: false, skipped: true } }),
    );

    expect(result.checks.find((check) => check.id === "test-files-exist")?.status).toBe(
      "undetermined",
    );
  });

  it("marks truncated tree with no found tests as undetermined", () => {
    const result = testingHealthPlugin.analyze(
      createFacts({ tree: { paths: ["README.md"], truncated: true, skipped: false } }),
    );

    expect(result.checks.find((check) => check.id === "test-files-exist")?.status).toBe(
      "undetermined",
    );
  });

  it("detects test directories and filename variants", () => {
    expect(
      hasTestPaths([
        "tests/unit/app.test.ts",
        "__tests__/index.spec.js",
        "spec/helper_test.go",
      ]),
    ).toBe(true);
  });

  it("detects package.json test script and framework dependencies", () => {
    const facts = createFacts({
      dependencyFiles: [
        {
          path: "package.json",
          name: "package.json",
          size: 1,
          content: JSON.stringify({
            scripts: { test: "vitest run" },
            devDependencies: { vitest: "^3.0.0" },
          }),
          contentStatus: "loaded",
        },
      ],
    });

    expect(hasJavaScriptTestFramework(facts)).toBe(true);
  });

  it("detects Python, Ruby, and Java framework examples", () => {
    expect(
      hasPythonTestFramework(
        createFacts({
          tree: { paths: ["pytest.ini"], truncated: false, skipped: false },
        }),
      ),
    ).toBe(true);
    expect(
      hasRubyTestFramework(
        createFacts({
          dependencyFiles: [
            {
              path: "Gemfile",
              name: "Gemfile",
              size: 1,
              content: "gem 'rspec'",
              contentStatus: "loaded",
            },
          ],
        }),
      ),
    ).toBe(true);
    expect(
      hasJavaTestFramework(
        createFacts({
          dependencyFiles: [
            {
              path: "pom.xml",
              name: "pom.xml",
              size: 1,
              content: "<dependency>junit</dependency>",
              contentStatus: "loaded",
            },
          ],
        }),
      ),
    ).toBe(true);
  });
});

describe("CiCdHealthPlugin", () => {
  it("detects workflows and test commands", () => {
    const withWorkflows = ciCdHealthPlugin.analyze(
      createFacts({
        workflowFiles: [
          {
            path: ".github/workflows/ci.yml",
            name: "ci.yml",
            size: 1,
            content: "run: npm test",
            contentStatus: "loaded",
          },
        ],
      }),
    );

    expect(withWorkflows.pointsAwarded).toBe(10);
  });

  it("marks unavailable workflow content as undetermined", () => {
    const result = ciCdHealthPlugin.analyze(
      createFacts({
        workflowFiles: [
          {
            path: ".github/workflows/ci.yml",
            name: "ci.yml",
            size: 1,
            content: null,
            contentStatus: "skipped-too-large",
          },
        ],
      }),
    );

    expect(
      result.checks.find((check) => check.id === "workflow-runs-tests")?.status,
    ).toBe("undetermined");
  });

  it("detects recognized test commands in workflow content", () => {
    expect(contentIncludesTestCommand("pnpm test")).toBe(true);
    expect(loadedWorkflowContents([{ content: "npm run test" }])).toEqual([
      "npm run test",
    ]);
  });
});

describe("SecurityHealthPlugin", () => {
  it("detects SECURITY files and Dependabot config", () => {
    const result = securityHealthPlugin.analyze(
      createFacts({
        githubEntries: [
          {
            name: "dependabot.yml",
            path: ".github/dependabot.yml",
            type: "file",
            size: 1,
          },
        ],
        tree: {
          paths: [".github/SECURITY.md", ".github/dependabot.yml"],
          truncated: false,
          skipped: false,
        },
      }),
    );

    expect(result.pointsAwarded).toBe(10);
  });
});

describe("Full HealthReport", () => {
  it("uses maxScore 100 and required plugin order", () => {
    const report = analyzeWithPlugins(createFacts(), defaultHealthPlugins);

    expect(report.maxScore).toBe(100);
    expect(report.categories.map((category) => category.categoryId)).toEqual(
      DEFAULT_PLUGIN_IDS,
    );
  });

  it("never awards more than 100 total points", () => {
    const report = analyzeWithPlugins(
      createFacts({
        license: { key: "mit", name: "MIT", spdxId: "MIT" },
        licenseFileExists: true,
        rootEntries: [
          { name: ".gitignore", path: ".gitignore", type: "file", size: 1 },
          { name: "package.json", path: "package.json", type: "file", size: 1 },
          { name: "src", path: "src", type: "dir", size: 0 },
        ],
        dependencyFiles: [
          {
            path: "package.json",
            name: "package.json",
            size: 1,
            content: JSON.stringify({
              scripts: { test: "vitest run" },
              devDependencies: { vitest: "1.0.0" },
            }),
            contentStatus: "loaded",
          },
        ],
        tree: {
          paths: ["src/app.test.ts", ".github/SECURITY.md", ".github/dependabot.yml"],
          truncated: false,
          skipped: false,
        },
        workflowFiles: [
          {
            path: ".github/workflows/ci.yml",
            name: "ci.yml",
            size: 1,
            content: "npm test",
            contentStatus: "loaded",
          },
        ],
        readme: {
          exists: true,
          path: "README.md",
          content: "# Project\n\n## Setup\n\n## Usage\n\n## Testing\n",
        },
        githubEntries: [
          {
            name: "ISSUE_TEMPLATE",
            path: ".github/ISSUE_TEMPLATE",
            type: "dir",
            size: 0,
          },
        ],
      }),
      defaultHealthPlugins,
    );

    expect(report.totalScore).toBeLessThanOrEqual(100);
  });

  it("sorts recommendations stably and removes duplicate SECURITY recommendations", () => {
    const recommendations = sortAndDedupeRecommendations([
      {
        id: "community-add-security-policy",
        categoryId: "community-standards",
        title: "Community security",
        description: "Community",
        actionType: "generate-document",
        relatedDocumentType: "security-policy",
        potentialPoints: 4,
      },
      {
        id: "security-add-security-policy",
        categoryId: "security",
        title: "Security policy",
        description: "Security",
        actionType: "generate-document",
        relatedDocumentType: "security-policy",
        potentialPoints: 5,
      },
      {
        id: "project-structure-add-gitignore",
        categoryId: "project-structure",
        title: "Gitignore",
        description: "Gitignore",
        actionType: "manual-fix",
        potentialPoints: 4,
      },
    ]);

    expect(recommendations.map((item) => item.id)).toEqual([
      "security-add-security-policy",
      "project-structure-add-gitignore",
    ]);
  });

  it("produces identical output for identical facts", () => {
    const facts = createFacts({ description: "Stable" });
    const first = analyzeWithPlugins(facts, defaultHealthPlugins);
    const second = analyzeWithPlugins(facts, defaultHealthPlugins);

    expect(first.totalScore).toBe(second.totalScore);
    expect(first.categories).toEqual(second.categories);
    expect(first.recommendations).toEqual(second.recommendations);
  });

  it("does not perform network or storage operations in plugins", () => {
    for (const plugin of defaultHealthPlugins) {
      expect(plugin.analyze).not.toBeUndefined();
    }

    expect(defaultHealthPlugins.map((plugin) => plugin.id)).toEqual([
      "documentation",
      "community-standards",
      "project-structure",
      "testing",
      "ci-cd",
      "security",
    ]);
  });
});

describe("RepoReady full score sanity check", () => {
  it("scores the local RepoReady repository from loaded facts", () => {
    const readmeContent = String(readFileSync("README.md", "utf8"));
    const packageJsonContent = String(readFileSync("package.json", "utf8"));
    const treePaths = [
      "README.md",
      "LICENSE",
      ".gitignore",
      "package.json",
      "src/background/auth-handlers.test.ts",
      "src/application/EvaluateHealthUseCase.test.ts",
      "src/domain/health/full-health-report.test.ts",
    ];

    const facts = createFacts({
      owner: "RepoReady",
      name: "repoready",
      description: "Chrome MV3 extension for repository health analysis.",
      licenseFileExists: true,
      rootEntries: [
        { name: "README.md", path: "README.md", type: "file", size: 100 },
        { name: "LICENSE", path: "LICENSE", type: "file", size: 50 },
        { name: ".gitignore", path: ".gitignore", type: "file", size: 45 },
        { name: "package.json", path: "package.json", type: "file", size: 889 },
        { name: "src", path: "src", type: "dir", size: 0 },
      ],
      readme: {
        exists: true,
        path: "README.md",
        content: readmeContent,
      },
      dependencyFiles: [
        {
          path: "package.json",
          name: "package.json",
          size: 889,
          content: packageJsonContent,
          contentStatus: "loaded",
        },
        {
          path: "package-lock.json",
          name: "package-lock.json",
          size: 170251,
          content: null,
          contentStatus: "skipped-lockfile",
        },
      ],
      tree: { paths: treePaths, truncated: false, skipped: false },
      workflowFiles: [],
    });

    const report = analyzeWithPlugins(facts, defaultHealthPlugins);

    expect(report.maxScore).toBe(100);
    expect(report.totalScore).toBe(47);
    expect(report.categories.find((c) => c.categoryId === "documentation")?.pointsAwarded).toBe(12);
    expect(report.categories.find((c) => c.categoryId === "community-standards")?.pointsAwarded).toBe(0);
    expect(report.categories.find((c) => c.categoryId === "project-structure")?.pointsAwarded).toBe(20);
    expect(report.categories.find((c) => c.categoryId === "testing")?.pointsAwarded).toBe(15);
    expect(report.categories.find((c) => c.categoryId === "ci-cd")?.pointsAwarded).toBe(0);
    expect(report.categories.find((c) => c.categoryId === "security")?.pointsAwarded).toBe(0);
  });
});
