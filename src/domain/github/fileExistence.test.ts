import { describe, expect, it } from "vitest";

import {
  detectFileWriteAction,
  fileExistsAtPath,
  getFileActionLabel,
} from "./fileExistence";
import type { RepositoryFacts } from "../models/repositoryFacts";

function createFacts(
  overrides: Partial<RepositoryFacts> = {},
): RepositoryFacts {
  return {
    owner: "owner",
    repo: "repo",
    defaultBranch: "main",
    description: null,
    homepage: null,
    visibility: "public",
    archived: false,
    fork: false,
    license: null,
    licenseFileExists: false,
    primaryLanguage: null,
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

describe("file existence detection", () => {
  it("detects missing files as create actions", () => {
    const facts = createFacts();

    expect(fileExistsAtPath(facts, "SECURITY.md")).toBe(false);
    expect(detectFileWriteAction(facts, "SECURITY.md")).toBe("create");
    expect(getFileActionLabel("create")).toBe("Create new file");
  });

  it("detects existing files as replace actions", () => {
    const facts = createFacts({
      tree: { paths: ["CONTRIBUTING.md"], truncated: false, skipped: false },
    });

    expect(detectFileWriteAction(facts, "CONTRIBUTING.md")).toBe("replace");
    expect(getFileActionLabel("replace")).toBe("Replace existing file");
  });

  it("uses improve-readme wording when README exists", () => {
    const facts = createFacts({
      readme: { exists: true, path: "README.md", content: "# Project" },
    });

    expect(detectFileWriteAction(facts, "README.md")).toBe("improve-readme");
    expect(getFileActionLabel("improve-readme")).toBe("Improve existing README");
  });
});
