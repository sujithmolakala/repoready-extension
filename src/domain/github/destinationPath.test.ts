import { describe, expect, it } from "vitest";

import { DOCUMENT_DESTINATION_PATHS } from "../models/documentType";
import { resolveDestinationPath } from "./destinationPath";

describe("destination path mapping", () => {
  it.each(Object.entries(DOCUMENT_DESTINATION_PATHS))(
    "maps %s to %s",
    (documentType, destinationPath) => {
      expect(
        resolveDestinationPath(documentType as keyof typeof DOCUMENT_DESTINATION_PATHS),
      ).toBe(destinationPath);
    },
  );

  it("allows advanced users to override destination path", () => {
    expect(
      resolveDestinationPath("SECURITY", "docs/SECURITY.md"),
    ).toBe("docs/SECURITY.md");
  });
});
