import type { Recommendation } from "../models/healthReport";

export const CATEGORY_ORDER = [
  "documentation",
  "community-standards",
  "project-structure",
  "testing",
  "ci-cd",
  "security",
] as const;

const DUPLICATE_RECOMMENDATION_TYPES = new Set(["security-policy"]);

export function sortAndDedupeRecommendations(
  recommendations: Recommendation[],
): Recommendation[] {
  const deduped = dedupeRecommendations(recommendations);

  return [...deduped].sort(compareRecommendations);
}

function dedupeRecommendations(
  recommendations: Recommendation[],
): Recommendation[] {
  const chosenByDocumentType = new Map<string, Recommendation>();

  for (const recommendation of recommendations) {
    const documentType = recommendation.relatedDocumentType;

    if (documentType === undefined || !DUPLICATE_RECOMMENDATION_TYPES.has(documentType)) {
      continue;
    }

    const existing = chosenByDocumentType.get(documentType);

    if (existing === undefined || preferRecommendation(recommendation, existing)) {
      chosenByDocumentType.set(documentType, recommendation);
    }
  }

  return recommendations.filter((recommendation) => {
    const documentType = recommendation.relatedDocumentType;

    if (documentType === undefined || !DUPLICATE_RECOMMENDATION_TYPES.has(documentType)) {
      return true;
    }

    const canonical = chosenByDocumentType.get(documentType);

    return canonical?.id === recommendation.id;
  });
}

function preferRecommendation(
  candidate: Recommendation,
  incumbent: Recommendation,
): boolean {
  if (candidate.categoryId === "security" && incumbent.categoryId !== "security") {
    return true;
  }

  if (incumbent.categoryId === "security" && candidate.categoryId !== "security") {
    return false;
  }

  return compareRecommendations(candidate, incumbent) < 0;
}

function compareRecommendations(
  left: Recommendation,
  right: Recommendation,
): number {
  if (left.potentialPoints !== right.potentialPoints) {
    return right.potentialPoints - left.potentialPoints;
  }

  const leftCategoryIndex = CATEGORY_ORDER.indexOf(
    left.categoryId as (typeof CATEGORY_ORDER)[number],
  );
  const rightCategoryIndex = CATEGORY_ORDER.indexOf(
    right.categoryId as (typeof CATEGORY_ORDER)[number],
  );

  if (leftCategoryIndex !== rightCategoryIndex) {
    return leftCategoryIndex - rightCategoryIndex;
  }

  return left.id.localeCompare(right.id);
}

export function getCategoryOrder(categoryId: string): number {
  const index = CATEGORY_ORDER.indexOf(categoryId as (typeof CATEGORY_ORDER)[number]);

  return index === -1 ? CATEGORY_ORDER.length : index;
}
