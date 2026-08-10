import type { DocumentType, RecommendationDocumentType } from "../models/documentType";
import type { Recommendation } from "../models/healthReport";

const RECOMMENDATION_TO_DOCUMENT_TYPES: Record<
  RecommendationDocumentType,
  readonly DocumentType[]
> = {
  contributing: ["CONTRIBUTING"],
  "code-of-conduct": ["CODE_OF_CONDUCT"],
  "security-policy": ["SECURITY"],
  changelog: ["CHANGELOG"],
  "issue-template": ["ISSUE_TEMPLATE_BUG", "ISSUE_TEMPLATE_FEATURE"],
  "pull-request-template": ["PULL_REQUEST_TEMPLATE"],
  readme: ["README_IMPROVEMENT"],
  documentation: ["DOCUMENTATION"],
  license: [],
};

const RECOMMENDATION_ID_OVERRIDES: Record<string, DocumentType[]> = {
  "documentation-add-setup-section": ["README_SETUP"],
  "documentation-add-testing-section": ["README_TESTING"],
  "documentation-add-usage-section": ["README_IMPROVEMENT"],
  "documentation-add-readme": ["README_IMPROVEMENT"],
};

export function mapRecommendationToDocumentTypes(
  recommendation: Recommendation,
): DocumentType[] {
  if (recommendation.actionType !== "generate-document") {
    return [];
  }

  if (Object.hasOwn(RECOMMENDATION_ID_OVERRIDES, recommendation.id)) {
    return [...RECOMMENDATION_ID_OVERRIDES[recommendation.id]];
  }

  const relatedDocumentType = recommendation.relatedDocumentType;

  if (relatedDocumentType === undefined) {
    return [];
  }

  if (!isSupportedRecommendationDocumentType(relatedDocumentType)) {
    return [];
  }

  return mapRelatedDocumentTypeToDocumentTypes(relatedDocumentType);
}

export function mapRelatedDocumentTypeToDocumentTypes(
  relatedDocumentType: RecommendationDocumentType,
): DocumentType[] {
  return [...RECOMMENDATION_TO_DOCUMENT_TYPES[relatedDocumentType]];
}

export function isSupportedRecommendationDocumentType(
  value: string,
): value is RecommendationDocumentType {
  return value in RECOMMENDATION_TO_DOCUMENT_TYPES;
}
