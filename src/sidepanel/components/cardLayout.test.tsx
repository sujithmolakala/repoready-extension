import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { Recommendation } from "../../domain/models/healthReport";
import { CardActionLayout } from "./CardActionLayout";
import { PotentialPointsLabel } from "./PotentialPointsLabel";
import { HealthScoreView } from "./HealthScoreView";

describe("card layout components", () => {
  it("renders potential points on one logical line", () => {
    const html = renderToStaticMarkup(<PotentialPointsLabel points={4} />);

    expect(html).toContain("Up to 4");
    expect(html).toContain("pts");
    expect(html).toContain('data-testid="potential-points-label"');
  });

  it("keeps actions inside the card action layout wrapper", () => {
    const html = renderToStaticMarkup(
      <CardActionLayout
        actions={<button type="button">Generate fix</button>}
        content={<p>Long recommendation title</p>}
      />,
    );

    expect(html).toContain('data-testid="card-action-layout"');
    expect(html).toContain("Generate fix");
    expect(html).toContain("min-w-0");
  });

  it("renders recommendation cards with nested action layout", () => {
    const recommendation: Recommendation = {
      id: "documentation-add-usage-section",
      categoryId: "documentation",
      title: "Add usage examples to the README for Bug Report Issue Template",
      description: "Add a Usage or Examples section.",
      actionType: "generate-document",
      relatedDocumentType: "readme",
      potentialPoints: 4,
    };

    const html = renderToStaticMarkup(
      <ul>
        <HealthScoreView
          expandedCategoryIds={[]}
          onGenerateFix={() => undefined}
          onToggleCategory={() => undefined}
          report={{
            owner: "acme",
            repo: "demo",
            totalScore: 10,
            maxScore: 100,
            categories: [],
            recommendations: [recommendation],
            analyzedAt: "2026-01-01T00:00:00.000Z",
          }}
        />
      </ul>,
    );

    expect(html).toContain('data-testid="recommendation-card"');
    expect(html).toContain('data-testid="generate-fix-button"');
    expect(html).toContain('data-testid="card-action-layout"');
    expect(html).toContain("Up to 4");
  });
});
