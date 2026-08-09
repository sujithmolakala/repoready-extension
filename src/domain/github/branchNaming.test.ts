import { describe, expect, it } from "vitest";

import {
  buildBaseBranchName,
  resolveUniqueBranchName,
} from "./branchNaming";

describe("branch naming", () => {
  it("builds deterministic branch names from document type", () => {
    expect(buildBaseBranchName("CONTRIBUTING", "CONTRIBUTING.md")).toBe(
      "repoready/docs/contributing",
    );
    expect(buildBaseBranchName("SECURITY", "SECURITY.md")).toBe(
      "repoready/docs/security",
    );
    expect(buildBaseBranchName("CONTRIBUTING", "README.md")).toBe(
      "repoready/docs/readme",
    );
  });

  it("appends numeric suffixes when branch already exists", () => {
    expect(
      resolveUniqueBranchName("repoready/docs/security", [
        "repoready/docs/security",
      ]),
    ).toBe("repoready/docs/security-2");

    expect(
      resolveUniqueBranchName("repoready/docs/security", [
        "repoready/docs/security",
        "repoready/docs/security-2",
      ]),
    ).toBe("repoready/docs/security-3");
  });
});
