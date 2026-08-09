import { describe, expect, it } from "vitest";

import { getDefaultCommitMessage } from "./commitMessages";
import {
  getDefaultPullRequestBody,
  getDefaultPullRequestTitle,
} from "./pullRequestDefaults";

describe("commit and pull request defaults", () => {
  it("generates sensible commit messages", () => {
    expect(
      getDefaultCommitMessage("SECURITY", "SECURITY.md", "create"),
    ).toBe("docs: add SECURITY.md");

    expect(
      getDefaultCommitMessage("CONTRIBUTING", "CONTRIBUTING.md", "replace"),
    ).toBe("docs: update CONTRIBUTING.md");

    expect(
      getDefaultCommitMessage("CONTRIBUTING", "README.md", "improve-readme"),
    ).toBe("docs: improve README");
  });

  it("generates pull request title and body", () => {
    const title = getDefaultPullRequestTitle(
      "SECURITY",
      "SECURITY.md",
      "create",
    );
    const body = getDefaultPullRequestBody(
      "SECURITY",
      "SECURITY.md",
      "create",
    );

    expect(title).toBe("docs: add SECURITY.md");
    expect(body).toContain("Generated using RepoReady");
    expect(body).toContain("Security Policy");
  });
});
