import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { RepositoryFacts } from "../models/repositoryFacts";
import { analyzeWithPlugins, aggregateHealthReport } from "./analyzeHealthReport";
import { communityStandardsHealthPlugin } from "./plugins/communityStandardsPlugin";
import { documentationHealthPlugin } from "./plugins/documentationPlugin";
import { defaultHealthPlugins } from "./defaultHealthPlugins";
import {
  hasSetupHeading,
  hasTestingGuidance,
  hasUsageHeading,
  wordAppearsInProse,
} from "./readme-analysis";

function createFacts(
  overrides: Partial<RepositoryFacts> = {},
): RepositoryFacts {
  return {
    owner: "RepoReady",
    name: "repoready",
    defaultBranch: "main",
    description: "A Chrome extension for repository health analysis.",
    homepage: "https://example.com/docs",
    visibility: "public",
    archived: false,
    fork: false,
    license: null,
    licenseFileExists: true,
    primaryLanguage: "TypeScript",
    languages: { TypeScript: 1000 },
    rootEntries: [
      { name: "README.md", path: "README.md", type: "file", size: 100 },
      { name: "CHANGELOG.md", path: "CHANGELOG.md", type: "file", size: 50 },
      { name: "docs", path: "docs", type: "dir", size: 0 },
    ],
    githubEntries: [
      {
        name: "PULL_REQUEST_TEMPLATE.md",
        path: ".github/PULL_REQUEST_TEMPLATE.md",
        type: "file",
        size: 20,
      },
      {
        name: "ISSUE_TEMPLATE",
        path: ".github/ISSUE_TEMPLATE",
        type: "dir",
        size: 0,
      },
    ],
    readme: {
      exists: true,
      path: "README.md",
      content: [
        "# Project",
        "",
        "## Setup",
        "",
        "## Usage",
        "",
        "## Testing",
        "",
        "```bash",
        "npm test",
        "```",
        "",
        "[Documentation](./docs)",
      ].join("\n"),
    },
    dependencyFiles: [],
    workflowFiles: [],
    tree: {
      paths: [
        "README.md",
        "CHANGELOG.md",
        "docs/guide.md",
        ".github/PULL_REQUEST_TEMPLATE.md",
        ".github/ISSUE_TEMPLATE/bug_report.md",
        "CONTRIBUTING.md",
        "CODE_OF_CONDUCT.md",
        "SECURITY.md",
      ],
      truncated: false,
      skipped: false,
    },
    activity: {
      pushedAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      openIssuesCount: 0,
      hasReleases: false,
    },
    fetchedAt: "2026-01-03T00:00:00Z",
    collectionWarnings: [],
    ...overrides,
  };
}

describe("DocumentationHealthPlugin", () => {
  it("uses exactly 25 max points", () => {
    expect(documentationHealthPlugin.maxPoints).toBe(25);
  });

  it("does not include homepage or README length checks", () => {
    const result = documentationHealthPlugin.analyze(createFacts());

    expect(result.checks.map((check) => check.id)).toEqual([
      "readme-present",
      "readme-setup",
      "readme-usage",
      "readme-testing",
      "repository-description",
      "changelog-present",
      "docs-directory-or-link",
    ]);
    expect(result.checks.some((check) => check.id === "homepage-link")).toBe(false);
    expect(result.checks.some((check) => check.id === "readme-substantial")).toBe(false);
  });

  it("marks README section checks as undetermined when README content is unavailable", () => {
    const result = documentationHealthPlugin.analyze(
      createFacts({
        rootEntries: [
          { name: "README.md", path: "README.md", type: "file", size: 100 },
        ],
        readme: { exists: true, path: "README.md", content: null },
      }),
    );

    expect(result.checks.find((check) => check.id === "readme-setup")?.status).toBe(
      "undetermined",
    );
    expect(result.checks.find((check) => check.id === "readme-usage")?.status).toBe(
      "undetermined",
    );
    expect(result.checks.find((check) => check.id === "readme-testing")?.status).toBe(
      "undetermined",
    );
    expect(
      result.checks.find((check) => check.id === "docs-directory-or-link")?.status,
    ).toBe("undetermined");
  });
});

describe("CommunityStandardsHealthPlugin", () => {
  it("uses exactly 20 max points", () => {
    expect(communityStandardsHealthPlugin.maxPoints).toBe(20);
  });

  it("does not include license, README, or description checks", () => {
    const result = communityStandardsHealthPlugin.analyze(createFacts());

    expect(result.checks.map((check) => check.id)).toEqual([
      "contributing-guidelines",
      "code-of-conduct",
      "security-policy",
      "issue-templates",
      "pull-request-template",
    ]);
    expect(result.checks.some((check) => check.id === "license-present")).toBe(false);
    expect(result.checks.some((check) => check.id === "community-readme-present")).toBe(
      false,
    );
    expect(
      result.checks.some((check) => check.id === "community-description-present"),
    ).toBe(false);
  });

  it("detects pull request templates", () => {
    const result = communityStandardsHealthPlugin.analyze(createFacts());

    expect(
      result.checks.find((check) => check.id === "pull-request-template")?.status,
    ).toBe("passed");
  });
});

describe("readme-analysis", () => {
  it("passes setup headings without matching prose mentions", () => {
    const content = [
      "This project mentions installation in prose but not as a heading.",
      "",
      "## Setup",
    ].join("\n");

    expect(hasSetupHeading(content)).toBe(true);
    expect(wordAppearsInProse(content, "installation")).toBe(true);
  });

  it("does not pass usage checks from prose alone", () => {
    const content = "You can find usage information throughout this document.";

    expect(hasUsageHeading(content)).toBe(false);
    expect(wordAppearsInProse(content, "usage")).toBe(true);
  });

  it("passes testing checks from fenced test commands", () => {
    const content = ["```bash", "npm run test", "```"].join("\n");

    expect(hasTestingGuidance(content)).toBe(true);
    expect(hasUsageHeading(content)).toBe(false);
  });
});

describe("analyzeWithPlugins", () => {
  it("aggregates to a partial health report max score of 45", () => {
    const facts = createFacts();
    const report = analyzeWithPlugins(facts, defaultHealthPlugins);

    expect(report.maxScore).toBe(45);
    expect(report.categories).toHaveLength(2);
    expect(report.categories[0]?.maxPoints).toBe(25);
    expect(report.categories[1]?.maxPoints).toBe(20);
  });

  it("sums awarded points exactly without rescaling", () => {
    const facts = createFacts();
    const categories = defaultHealthPlugins.map((plugin) => plugin.analyze(facts));
    const report = aggregateHealthReport(facts, categories);

    expect(report.totalScore).toBe(
      categories.reduce((total, category) => total + category.pointsAwarded, 0),
    );
    expect(report.maxScore).toBe(45);
  });

  it("returns stable recommendation order for identical facts", () => {
    const facts = createFacts({
      description: null,
      rootEntries: [{ name: "README.md", path: "README.md", type: "file", size: 1 }],
      githubEntries: [],
      readme: { exists: false, path: null, content: null },
      tree: { paths: ["README.md"], truncated: false, skipped: false },
    });

    const first = analyzeWithPlugins(facts, defaultHealthPlugins);
    const second = analyzeWithPlugins(facts, defaultHealthPlugins);

    expect(first.recommendations.map((item) => item.id)).toEqual(
      second.recommendations.map((item) => item.id),
    );
  });
});

describe("RepoReady score sanity check", () => {
  it("scores the local RepoReady README without hardcoding the final total", () => {
    const readmeContent = String(readFileSync("README.md", "utf8"));

    const facts = createFacts({
      description: "Chrome MV3 extension for repository health analysis.",
      homepage: null,
      licenseFileExists: true,
      rootEntries: [
        { name: "README.md", path: "README.md", type: "file", size: 100 },
        { name: "LICENSE", path: "LICENSE", type: "file", size: 50 },
        { name: "package.json", path: "package.json", type: "file", size: 100 },
      ],
      githubEntries: [],
      readme: {
        exists: true,
        path: "README.md",
        content: readmeContent,
      },
      tree: {
        paths: ["README.md", "LICENSE", "package.json", "src/index.ts"],
        truncated: false,
        skipped: false,
      },
    });

    const report = analyzeWithPlugins(facts, defaultHealthPlugins);
    const documentation = report.categories.find(
      (category) => category.categoryId === "documentation",
    );
    const community = report.categories.find(
      (category) => category.categoryId === "community-standards",
    );

    expect(documentation?.pointsAwarded).toBe(12);
    expect(documentation?.maxPoints).toBe(25);
    expect(community?.pointsAwarded).toBe(0);
    expect(community?.maxPoints).toBe(20);
    expect(report.totalScore).toBe(12);
    expect(report.maxScore).toBe(45);
  });
});
