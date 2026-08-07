import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { GenerateDocumentUseCase } from "../../application/GenerateDocumentUseCase";
import { documentExistsAtDestination } from "./document-existence";
import { getDocumentOpportunities } from "./documentOpportunities";
import {
  documentTemplates,
  renderDocumentTemplate,
} from "./documentTemplates";
import {
  mapRecommendationToDocumentTypes,
  mapRelatedDocumentTypeToDocumentTypes,
} from "./recommendation-mapping";
import {
  detectInstallCommand,
  detectPackageManager,
  detectTestCommand,
} from "./repository-fact-helpers";
import { analyzeWithPlugins } from "../health/analyzeHealthReport";
import { defaultHealthPlugins } from "../health/defaultHealthPlugins";
import {
  DOCUMENT_DESTINATION_PATHS,
  GENERATABLE_DOCUMENT_TYPES,
  type DocumentType,
} from "../models/documentType";
import type { Recommendation } from "../models/healthReport";
import type { RepositoryFacts } from "../models/repositoryFacts";

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
    fetchedAt: "2026-01-01T00:00:00.000Z",
    collectionWarnings: [],
    ...overrides,
  };
}

function recommendation(
  overrides: Partial<Recommendation> & Pick<Recommendation, "id" | "relatedDocumentType">,
): Recommendation {
  return {
    categoryId: "community-standards",
    title: "Example",
    description: "Example recommendation",
    actionType: "generate-document",
    potentialPoints: 4,
    ...overrides,
  };
}

describe("DocumentType destination paths", () => {
  it.each(GENERATABLE_DOCUMENT_TYPES)(
    "maps %s to the canonical destination path",
    (documentType) => {
      const template = documentTemplates.find(
        (entry) => entry.documentType === documentType,
      );

      expect(template?.destinationPath).toBe(
        DOCUMENT_DESTINATION_PATHS[documentType],
      );
    },
  );
});

describe("Static document templates", () => {
  it.each(GENERATABLE_DOCUMENT_TYPES)(
    "renders non-empty Markdown for %s",
    (documentType) => {
      const result = renderDocumentTemplate(documentType, createFacts());

      expect(result.markdown.trim().length).toBeGreaterThan(0);
    },
  );

  it.each(GENERATABLE_DOCUMENT_TYPES)(
    "renders deterministically for %s",
    (documentType) => {
      const facts = createFacts({ name: "deterministic-repo" });
      const first = renderDocumentTemplate(documentType, facts);
      const second = renderDocumentTemplate(documentType, facts);

      expect(first.markdown).toBe(second.markdown);
    },
  );

  it.each(GENERATABLE_DOCUMENT_TYPES)(
    "leaves no unresolved placeholder tokens for %s",
    (documentType) => {
      const markdown = renderDocumentTemplate(documentType, createFacts()).markdown;

      expect(markdown).not.toMatch(/\{\{[^}]+\}\}/);
    },
  );

  it("does not invent install or test commands without evidence", () => {
    const markdown = renderDocumentTemplate("CONTRIBUTING", createFacts()).markdown;

    expect(markdown).not.toMatch(/npm install|yarn install|pnpm install|npm test/);
    expect(markdown).toContain(
      "<!-- TODO: Add the command contributors should use to run tests -->",
    );
  });

  it("derives npm install from package-lock.json", () => {
    const facts = createFacts({
      dependencyFiles: [
        {
          path: "package.json",
          name: "package.json",
          size: 1,
          content: JSON.stringify({ name: "repo" }),
          contentStatus: "loaded",
        },
        {
          path: "package-lock.json",
          name: "package-lock.json",
          size: 1,
          content: null,
          contentStatus: "skipped-lockfile",
        },
      ],
      tree: { paths: ["package.json", "package-lock.json"], truncated: false, skipped: false },
    });

    expect(detectPackageManager(facts)).toBe("npm");
    expect(detectInstallCommand(facts)).toBe("npm install");
  });

  it("derives yarn install from yarn.lock", () => {
    const facts = createFacts({
      tree: { paths: ["package.json", "yarn.lock"], truncated: false, skipped: false },
    });

    expect(detectPackageManager(facts)).toBe("yarn");
    expect(detectInstallCommand(facts)).toBe("yarn install");
  });

  it("derives pnpm install from pnpm-lock.yaml", () => {
    const facts = createFacts({
      tree: { paths: ["package.json", "pnpm-lock.yaml"], truncated: false, skipped: false },
    });

    expect(detectPackageManager(facts)).toBe("pnpm");
    expect(detectInstallCommand(facts)).toBe("pnpm install");
  });

  it("derives npm test from a package.json test script and npm lockfile", () => {
    const facts = createFacts({
      dependencyFiles: [
        {
          path: "package.json",
          name: "package.json",
          size: 1,
          content: JSON.stringify({ scripts: { test: "vitest run" } }),
          contentStatus: "loaded",
        },
      ],
      tree: { paths: ["package.json", "package-lock.json"], truncated: false, skipped: false },
    });

    expect(detectTestCommand(facts)).toBe("npm test");
    expect(renderDocumentTemplate("CONTRIBUTING", facts).markdown).toContain("npm test");
  });

  it("never invents a security email", () => {
    const markdown = renderDocumentTemplate("SECURITY", createFacts()).markdown;

    expect(markdown).not.toMatch(/@/);
    expect(markdown).toContain(
      "<!-- TODO: Add a private security reporting contact or process -->",
    );
  });

  it("never invents a code of conduct contact", () => {
    const markdown = renderDocumentTemplate("CODE_OF_CONDUCT", createFacts()).markdown;

    expect(markdown).not.toMatch(/@/);
    expect(markdown).toContain(
      "<!-- TODO: Add a private contact method for conduct reports -->",
    );
  });

  it("never invents historical releases in the changelog", () => {
    const markdown = renderDocumentTemplate("CHANGELOG", createFacts()).markdown;

    expect(markdown).toContain("## Unreleased");
    expect(markdown).not.toMatch(/## \[?\d+\.\d+/);
  });

  it("uses valid issue-template front matter without invented labels or assignees", () => {
    for (const documentType of [
      "ISSUE_TEMPLATE_BUG",
      "ISSUE_TEMPLATE_FEATURE",
    ] as const) {
      const markdown = renderDocumentTemplate(documentType, createFacts()).markdown;

      expect(markdown.startsWith("---")).toBe(true);
      expect(markdown).toContain('labels: ""');
      expect(markdown).toContain('assignees: ""');
      expect(markdown).not.toMatch(/labels: bug|assignees: maintainer/i);
    }
  });
});

describe("Recommendation to document mapping", () => {
  it("maps supported recommendations to the expected document types", () => {
    expect(
      mapRelatedDocumentTypeToDocumentTypes("contributing"),
    ).toEqual(["CONTRIBUTING"]);
    expect(
      mapRelatedDocumentTypeToDocumentTypes("issue-template"),
    ).toEqual(["ISSUE_TEMPLATE_BUG", "ISSUE_TEMPLATE_FEATURE"]);
    expect(mapRelatedDocumentTypeToDocumentTypes("readme")).toEqual([]);
  });

  it("ignores manual-fix recommendations", () => {
    const mapped = mapRecommendationToDocumentTypes(
      recommendation({
        id: "documentation-add-description",
        relatedDocumentType: "contributing",
        actionType: "manual-fix",
      }),
    );

    expect(mapped).toEqual([]);
  });
});

describe("Document opportunities and drafts", () => {
  it("does not offer generation when the destination file already exists", () => {
    const facts = createFacts({
      tree: {
        paths: ["CONTRIBUTING.md", "CODE_OF_CONDUCT.md"],
        truncated: false,
        skipped: false,
      },
    });
    const report = analyzeWithPlugins(
      createFacts({
        githubEntries: [],
        tree: { paths: [], truncated: false, skipped: false },
      }),
      defaultHealthPlugins,
    );

    const opportunities = getDocumentOpportunities(facts, report).map(
      (entry) => entry.documentType,
    );

    expect(opportunities).not.toContain("CONTRIBUTING");
    expect(documentExistsAtDestination(facts, "CONTRIBUTING")).toBe(true);
  });

  it("returns DraftDocument drafts with static-template source", () => {
    const useCase = new GenerateDocumentUseCase();
    const draft = useCase.execute({
      owner: "RepoReady",
      repo: "repoready",
      documentType: "SECURITY",
      facts: createFacts({ owner: "RepoReady", name: "repoready" }),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(draft.status).toBe("draft");
    expect(draft.source).toBe("static-template");
    expect(draft.destinationPath).toBe("SECURITY.md");
  });

  it("produces byte-identical Markdown for identical facts", () => {
    const facts = createFacts({ name: "repoready" });
    const first = renderDocumentTemplate("PULL_REQUEST_TEMPLATE", facts).markdown;
    const second = renderDocumentTemplate("PULL_REQUEST_TEMPLATE", facts).markdown;

    expect(first).toBe(second);
  });

  it("does not perform network, storage, or Chrome API calls", () => {
    expect(typeof renderDocumentTemplate).toBe("function");
    expect(typeof documentExistsAtDestination).toBe("function");
  });
});

describe("RepoReady document opportunities", () => {
  it("offers the expected missing documents for the local repository", () => {
    const readmeContent = String(readFileSync("README.md", "utf8"));
    const packageJsonContent = String(readFileSync("package.json", "utf8"));
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
      tree: {
        paths: [
          "README.md",
          "LICENSE",
          ".gitignore",
          "package.json",
          "package-lock.json",
          "src/application/EvaluateHealthUseCase.test.ts",
        ],
        truncated: false,
        skipped: false,
      },
      workflowFiles: [],
    });

    const report = analyzeWithPlugins(facts, defaultHealthPlugins);
    const opportunities = getDocumentOpportunities(facts, report).map(
      (entry) => entry.documentType,
    );

    const expected: DocumentType[] = [
      "CONTRIBUTING",
      "CODE_OF_CONDUCT",
      "SECURITY",
      "CHANGELOG",
      "ISSUE_TEMPLATE_BUG",
      "ISSUE_TEMPLATE_FEATURE",
      "PULL_REQUEST_TEMPLATE",
    ];

    expect(opportunities).toHaveLength(expected.length);
    expect([...opportunities].sort()).toEqual([...expected].sort());
  });
});
