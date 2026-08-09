import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { GitHubWriteError, GitHubWriteErrorCode } from "../../domain/github/writeErrors";
import { GitHubWriterImpl } from "./GitHubWriterImpl";
import type { CreatePullRequestRequest } from "../../domain/github/writeTypes";
import type { DraftDocument } from "../../domain/models/draftDocument";
import type { RepositoryFacts } from "../../domain/models/repositoryFacts";

function createFacts(): RepositoryFacts {
  return {
    owner: "cursor",
    name: "repoready",
    defaultBranch: "main",
    description: null,
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
  };
}

function createDraft(): DraftDocument {
  return {
    id: "cursor/repoready/SECURITY",
    owner: "cursor",
    repo: "repoready",
    documentType: "SECURITY",
    destinationPath: "SECURITY.md",
    content: "# Security\n",
    originalContent: "# Security\n",
    isDirty: false,
    warnings: [],
    status: "draft",
    source: "static-template",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function createRequest(): CreatePullRequestRequest {
  return {
    facts: createFacts(),
    draft: createDraft(),
    destinationPath: "SECURITY.md",
    branchName: "repoready/docs/security",
    commitMessage: "docs: add SECURITY.md",
    pullRequestTitle: "docs: add SECURITY.md",
    pullRequestBody: "Generated using RepoReady",
  };
}

describe("GitHubWriterImpl", () => {
  it("lists branch names from the branches API", async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.includes("/branches?")) {
        return Response.json([{ name: "main" }, { name: "repoready/docs/security" }]);
      }

      return new Response(null, { status: 404 });
    });

    const writer = new GitHubWriterImpl(
      { getToken: async () => "token", getAuthState: async () => null, isAuthenticated: async () => true },
      fetchFn,
    );

    await expect(writer.listBranchNames("cursor", "repoready")).resolves.toEqual([
      "main",
      "repoready/docs/security",
    ]);
  });

  it("creates branch, commit, and pull request through the git data API", async () => {
    const calls: string[] = [];
    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${url}`);

      if (url.endsWith("/git/ref/heads/main")) {
        return Response.json({ object: { sha: "base-commit" } });
      }

      if (url.includes("/git/ref/heads/repoready")) {
        return Response.json({ object: { sha: "base-commit" } });
      }

      if (url.endsWith("/git/commits/base-commit")) {
        return Response.json({ tree: { sha: "base-tree" } });
      }

      if (url.endsWith("/git/refs") && init?.method === "POST") {
        return Response.json({}, { status: 201 });
      }

      if (url.includes("/git/ref/heads/repoready%2Fdocs%2Fsecurity")) {
        return Response.json({ object: { sha: "base-commit" } });
      }

      if (url.endsWith("/git/blobs") && init?.method === "POST") {
        return Response.json({ sha: "blob-sha" }, { status: 201 });
      }

      if (url.endsWith("/git/trees") && init?.method === "POST") {
        return Response.json({ sha: "tree-sha" }, { status: 201 });
      }

      if (url.endsWith("/git/commits") && init?.method === "POST") {
        return Response.json({ sha: "commit-sha" }, { status: 201 });
      }

      if (url.includes("/git/refs/heads/repoready") && init?.method === "PATCH") {
        return Response.json({});
      }

      if (url.endsWith("/pulls") && init?.method === "POST") {
        return Response.json(
          { html_url: "https://github.com/cursor/repoready/pull/1", number: 1 },
          { status: 201 },
        );
      }

      return new Response(null, { status: 404 });
    });

    const writer = new GitHubWriterImpl(
      { getToken: async () => "token", getAuthState: async () => null, isAuthenticated: async () => true },
      fetchFn,
    );

    const result = await writer.createPullRequest(createRequest());

    expect(result.pullRequestNumber).toBe(1);
    expect(result.branchName).toBe("repoready/docs/security");
    expect(result.commitSha).toBe("commit-sha");
    expect(calls.some((call) => call.startsWith("POST") && call.includes("/git/refs"))).toBe(
      true,
    );
    expect(calls.some((call) => call.startsWith("POST") && call.includes("/pulls"))).toBe(true);
  });

  it("cleans up the branch when commit creation fails", async () => {
    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/git/ref/heads/main")) {
        return Response.json({ object: { sha: "base-commit" } });
      }

      if (url.includes("/git/ref/heads/repoready")) {
        return Response.json({ object: { sha: "base-commit" } });
      }

      if (url.endsWith("/git/commits/base-commit")) {
        return Response.json({ tree: { sha: "base-tree" } });
      }

      if (url.endsWith("/git/refs") && init?.method === "POST") {
        return Response.json({}, { status: 201 });
      }

      if (url.includes("/git/ref/heads/repoready%2Fdocs%2Fsecurity")) {
        return Response.json({ object: { sha: "base-commit" } });
      }

      if (url.endsWith("/git/blobs") && init?.method === "POST") {
        return Response.json({ sha: "blob-sha" }, { status: 201 });
      }

      if (url.endsWith("/git/trees") && init?.method === "POST") {
        throw new Error("tree failed");
      }

      if (url.includes("/git/refs/heads/repoready") && init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }

      return new Response(null, { status: 404 });
    });

    const writer = new GitHubWriterImpl(
      { getToken: async () => "token", getAuthState: async () => null, isAuthenticated: async () => true },
      fetchFn,
    );

    await expect(writer.createPullRequest(createRequest())).rejects.toBeInstanceOf(
      GitHubWriteError,
    );

    expect(
      fetchFn.mock.calls.some(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/git/refs/heads/repoready") &&
          init?.method === "DELETE",
      ),
    ).toBe(true);
  });

  it("maps permission failures to typed errors", async () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 403 }));

    const writer = new GitHubWriterImpl(
      { getToken: async () => "token", getAuthState: async () => null, isAuthenticated: async () => true },
      fetchFn,
    );

    await expect(writer.listBranchNames("cursor", "repoready")).rejects.toMatchObject({
      code: GitHubWriteErrorCode.INSUFFICIENT_PERMISSIONS,
    });
  });
});

describe("GitHubWriter interface", () => {
  it("has no UI dependencies", () => {
    const source = String(readFileSync("src/infrastructure/github/GitHubWriter.ts", "utf8"));

    expect(source.includes("react")).toBe(false);
    expect(source.includes("sidepanel")).toBe(false);
  });
});
