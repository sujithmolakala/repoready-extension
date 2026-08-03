import { describe, expect, it } from "vitest";

import {
  hasDocumentationLink,
  hasSetupHeading,
  hasTestingGuidance,
  hasUsageHeading,
  wordAppearsInProse,
} from "./readme-analysis";

describe("readme-analysis", () => {
  it("matches setup headings case-insensitively", () => {
    expect(hasSetupHeading("## Getting Started\n")).toBe(true);
    expect(hasSetupHeading("## SETUP\n")).toBe(true);
  });

  it("does not pass setup checks from prose alone", () => {
    const content = "Follow the installation guide in this paragraph.";

    expect(hasSetupHeading(content)).toBe(false);
    expect(wordAppearsInProse(content, "installation")).toBe(true);
  });

  it("matches usage headings exactly", () => {
    expect(hasUsageHeading("## Usage\n")).toBe(true);
    expect(hasUsageHeading("## Examples\n")).toBe(true);
    expect(hasUsageHeading("Usage examples appear here.")).toBe(false);
  });

  it("matches testing headings and fenced commands", () => {
    expect(hasTestingGuidance("## Testing\n")).toBe(true);
    expect(
      hasTestingGuidance(["```bash", "pnpm test", "```"].join("\n")),
    ).toBe(true);
    expect(hasTestingGuidance("## Manual testing checklist\n")).toBe(false);
  });

  it("detects conservative documentation links", () => {
    expect(hasDocumentationLink("[Project docs](./docs/guide.md)")).toBe(true);
    expect(hasDocumentationLink("[Website](https://example.com)")).toBe(false);
  });
});
