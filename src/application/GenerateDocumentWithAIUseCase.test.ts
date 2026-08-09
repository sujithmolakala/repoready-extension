import { describe, expect, it, vi } from "vitest";

import { GenerateDocumentWithAIUseCase } from "./GenerateDocumentWithAIUseCase";
import { GenerateDocumentUseCase } from "./GenerateDocumentUseCase";
import { AIError, AIErrorCode } from "../domain/ai/aiErrors";
import type { AIProvider } from "../infrastructure/ai/AIProvider";
import type { RepositoryFacts } from "../domain/models/repositoryFacts";

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
    license: null,
    licenseFileExists: false,
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
      {
        path: "package-lock.json",
        name: "package-lock.json",
        size: 100,
        content: "{}",
        contentStatus: "loaded",
      },
    ],
    workflowFiles: [],
    tree: { paths: ["src/index.ts", "package.json"], truncated: false, skipped: false },
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

describe("GenerateDocumentWithAIUseCase", () => {
  it("creates an ai-generated draft with metadata", async () => {
    const provider: AIProvider = {
      id: "openai",
      displayName: "OpenAI",
      generateDocument: vi.fn(async () => ({
        markdown: "# Contributing\n\n<!-- TODO: Add manually -->\n",
        provider: "openai",
        model: "gpt-4.1-mini",
      })),
    };

    const useCase = new GenerateDocumentWithAIUseCase(provider);
    const draft = await useCase.execute({
      owner: "cursor",
      repo: "repoready",
      documentType: "CONTRIBUTING",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(draft.source).toBe("ai-generated");
    expect(draft.aiMetadata).toEqual({
      provider: "openai",
      model: "gpt-4.1-mini",
    });
    expect(draft.originalContent).toBe(draft.content);
    expect(draft.isDirty).toBe(false);
  });

  it("rejects empty AI output", async () => {
    const provider: AIProvider = {
      id: "openai",
      displayName: "OpenAI",
      generateDocument: vi.fn(async () => ({
        markdown: "   ",
        provider: "openai",
        model: "gpt-4.1-mini",
      })),
    };

    const useCase = new GenerateDocumentWithAIUseCase(provider);

    await expect(
      useCase.execute({
        owner: "cursor",
        repo: "repoready",
        documentType: "CONTRIBUTING",
        facts: createFacts(),
      }),
    ).rejects.toBeInstanceOf(AIError);
  });

  it("fails gracefully when provider throws missing API key", async () => {
    const provider: AIProvider = {
      id: "openai",
      displayName: "OpenAI",
      generateDocument: vi.fn(async () => {
        throw new AIError(
          AIErrorCode.MISSING_API_KEY,
          "Connect OpenAI in Settings before generating with AI.",
        );
      }),
    };

    const useCase = new GenerateDocumentWithAIUseCase(provider);

    await expect(
      useCase.execute({
        owner: "cursor",
        repo: "repoready",
        documentType: "CONTRIBUTING",
        facts: createFacts(),
      }),
    ).rejects.toMatchObject({ code: AIErrorCode.MISSING_API_KEY });
  });
});

describe("static generation without AI", () => {
  it("still works with no AI configured", () => {
    const useCase = new GenerateDocumentUseCase();
    const draft = useCase.execute({
      owner: "cursor",
      repo: "repoready",
      documentType: "CONTRIBUTING",
      facts: createFacts(),
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(draft.source).toBe("static-template");
    expect(draft.aiMetadata).toBeUndefined();
  });
});
