import { documentExistsAtDestination } from "./document-existence";
import { mapRecommendationToDocumentTypes } from "./recommendation-mapping";
import {
  getDocumentDestinationPath,
  getDocumentDisplayName,
} from "../models/documentType";
import type { DocumentType } from "../models/documentType";
import type { HealthReport } from "../models/healthReport";
import type { RepositoryFacts } from "../models/repositoryFacts";

export interface DocumentOpportunity {
  documentType: DocumentType;
  displayName: string;
  destinationPath: string;
  reason: string;
  potentialPoints: number;
  recommendationId: string;
  categoryId: string;
}

export function getDocumentOpportunities(
  facts: RepositoryFacts,
  report: HealthReport,
): DocumentOpportunity[] {
  const opportunities: DocumentOpportunity[] = [];
  const seenDocumentTypes = new Set<DocumentType>();

  for (const recommendation of report.recommendations) {
    const documentTypes = mapRecommendationToDocumentTypes(recommendation);

    for (const documentType of documentTypes) {
      if (seenDocumentTypes.has(documentType)) {
        continue;
      }

      if (documentExistsAtDestination(facts, documentType)) {
        continue;
      }

      seenDocumentTypes.add(documentType);
      opportunities.push({
        documentType,
        displayName: getDocumentDisplayName(documentType),
        destinationPath: getDocumentDestinationPath(documentType),
        reason: recommendation.description,
        potentialPoints: recommendation.potentialPoints,
        recommendationId: recommendation.id,
        categoryId: recommendation.categoryId,
      });
    }
  }

  return sortOpportunities(opportunities);
}

function sortOpportunities(
  opportunities: DocumentOpportunity[],
): DocumentOpportunity[] {
  return [...opportunities].sort((left, right) => {
    if (left.potentialPoints !== right.potentialPoints) {
      return right.potentialPoints - left.potentialPoints;
    }

    return left.documentType.localeCompare(right.documentType);
  });
}
