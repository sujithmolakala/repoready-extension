import { describe, expect, it } from "vitest";

import { validateAIMarkdown } from "./aiMarkdownValidator";
import type { AIFactsPayload } from "./aiFactsPayload";

function createFacts(overrides: Partial<AIFactsPayload> = {}): AIFactsPayload {
  return {
    owner: "owner",
    repo: "repo",
    description: null,
    primaryLanguage: "TypeScript",
    packageManager: "npm",
    installCommand: "npm install",
    testCommand: "npm test",
    licenseName: null,
    readmeExcerpt: null,
    relevantPaths: ["src/index.ts"],
    hasTests: true,
    hasCi: true,
    workflowSummaries: [],
    manifestExcerpts: [],
    truncated: false,
    ...overrides,
  };
}

describe("validateAIMarkdown", () => {
  it("rejects empty output", () => {
    const result = validateAIMarkdown("   ", createFacts());

    expect(result.isValid).toBe(false);
    expect(result.rejectionReason).toContain("empty");
  });

  it("detects unresolved placeholders", () => {
    const result = validateAIMarkdown(
      "# Doc\n\n{{owner}}/{{repo}}\n\n```bash\nnpm install\n```",
      createFacts(),
    );

    expect(result.isValid).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("placeholder"))).toBe(
      true,
    );
  });

  it("warns when test command is invented", () => {
    const result = validateAIMarkdown(
      "# Doc\n\n```bash\nnpm test\n```",
      createFacts({ testCommand: null }),
    );

    expect(result.warnings.some((warning) => warning.includes("test command"))).toBe(
      true,
    );
  });

  it("warns when package manager command mismatches facts", () => {
    const result = validateAIMarkdown(
      "# Doc\n\n```bash\npnpm install\n```",
      createFacts({ packageManager: "npm", installCommand: "npm install" }),
    );

    expect(
      result.warnings.some((warning) => warning.includes("unexpected package manager")),
    ).toBe(true);
  });

  it("warns on unknown local paths", () => {
    const result = validateAIMarkdown(
      "# Doc\n\nSee `./missing/deep/path.ts` for details.",
      createFacts({ relevantPaths: ["src/index.ts"] }),
    );

    expect(
      result.warnings.some((warning) => warning.includes("was not detected")),
    ).toBe(true);
  });

  it("does not delete generated content when warnings are present", () => {
    const markdown = "# Doc\n\n```bash\npnpm test\n```";
    const result = validateAIMarkdown(
      markdown,
      createFacts({ packageManager: "npm", testCommand: null }),
    );

    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("allows intentional RepoReady TODO comments", () => {
    const result = validateAIMarkdown(
      "# Doc\n\n<!-- TODO: Add manually -->",
      createFacts(),
    );

    expect(result.warnings.some((warning) => warning.includes("placeholder"))).toBe(
      false,
    );
  });
});
