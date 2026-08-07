export type {
  FileEntry,
  RepositoryFacts,
  RepositoryFactsState,
  RepositoryFile,
} from "./models/repositoryFacts";
export {
  emptyRepositoryFactsState,
  repositoryKey,
} from "./models/repositoryFacts";
export type {
  DocumentType,
  RecommendationDocumentType,
} from "./models/documentType";
export {
  DOCUMENT_DESTINATION_PATHS,
  DOCUMENT_DISPLAY_NAMES,
  GENERATABLE_DOCUMENT_TYPES,
  getDocumentDestinationPath,
  getDocumentDisplayName,
} from "./models/documentType";
export type {
  DraftDocument,
  DraftDocumentSource,
  DraftDocumentStatus,
} from "./models/draftDocument";
export type { DocumentOpportunity } from "./documents/documentOpportunities";
export { getDocumentOpportunities } from "./documents/documentOpportunities";
export { documentExistsAtDestination } from "./documents/document-existence";
export {
  detectInstallCommand,
  detectPackageManager,
  detectTestCommand,
  getLicenseDisplayName,
  getPrimaryLanguage,
  getRepositoryDescription,
  repositoryHasCi,
  repositoryHasTests,
} from "./documents/repository-fact-helpers";
export {
  mapRecommendationToDocumentTypes,
  mapRelatedDocumentTypeToDocumentTypes,
} from "./documents/recommendation-mapping";
export {
  documentTemplates,
  getDocumentTemplate,
  renderDocumentTemplate,
} from "./documents/documentTemplates";
export type {
  DocumentTemplate,
  TemplateRenderResult,
} from "./documents/template-types";
export type {
  CheckResult,
  HealthPlugin,
  HealthReport,
  HealthReportState,
  PluginResult,
  Recommendation,
} from "./models/healthReport";
export { emptyHealthReportState } from "./models/healthReport";
export { analyzeWithPlugins, aggregateHealthReport } from "./health/analyzeHealthReport";
export { defaultHealthPlugins, DEFAULT_PLUGIN_IDS } from "./health/defaultHealthPlugins";
export { documentationHealthPlugin } from "./health/plugins/documentationPlugin";
export { communityStandardsHealthPlugin } from "./health/plugins/communityStandardsPlugin";
export { projectStructureHealthPlugin } from "./health/plugins/projectStructurePlugin";
export { testingHealthPlugin } from "./health/plugins/testingPlugin";
export { ciCdHealthPlugin } from "./health/plugins/ciCdPlugin";
export { securityHealthPlugin } from "./health/plugins/securityPlugin";
