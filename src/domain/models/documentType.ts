export type DocumentType =
  | "CONTRIBUTING"
  | "CODE_OF_CONDUCT"
  | "SECURITY"
  | "CHANGELOG"
  | "ISSUE_TEMPLATE_BUG"
  | "ISSUE_TEMPLATE_FEATURE"
  | "PULL_REQUEST_TEMPLATE";

/** Reserved for a future README improvement flow; not generated in this milestone. */
export type FutureDocumentType = "README";

/** Kebab-case keys emitted by health plugins before mapping to DocumentType. */
export type RecommendationDocumentType =
  | "contributing"
  | "code-of-conduct"
  | "security-policy"
  | "changelog"
  | "issue-template"
  | "pull-request-template"
  | "readme"
  | "documentation"
  | "license";

export const DOCUMENT_DESTINATION_PATHS: Record<DocumentType, string> = {
  CONTRIBUTING: "CONTRIBUTING.md",
  CODE_OF_CONDUCT: "CODE_OF_CONDUCT.md",
  SECURITY: "SECURITY.md",
  CHANGELOG: "CHANGELOG.md",
  ISSUE_TEMPLATE_BUG: ".github/ISSUE_TEMPLATE/bug_report.md",
  ISSUE_TEMPLATE_FEATURE: ".github/ISSUE_TEMPLATE/feature_request.md",
  PULL_REQUEST_TEMPLATE: ".github/PULL_REQUEST_TEMPLATE.md",
};

export const DOCUMENT_DISPLAY_NAMES: Record<DocumentType, string> = {
  CONTRIBUTING: "Contributing Guidelines",
  CODE_OF_CONDUCT: "Code of Conduct",
  SECURITY: "Security Policy",
  CHANGELOG: "Changelog",
  ISSUE_TEMPLATE_BUG: "Bug Report Issue Template",
  ISSUE_TEMPLATE_FEATURE: "Feature Request Issue Template",
  PULL_REQUEST_TEMPLATE: "Pull Request Template",
};

export const DOCUMENT_DESCRIPTIONS: Record<DocumentType, string> = {
  CONTRIBUTING:
    "Guidance for contributors covering setup, testing, and pull requests.",
  CODE_OF_CONDUCT:
    "Community expectations for respectful collaboration and reporting concerns.",
  SECURITY:
    "Instructions for privately reporting security vulnerabilities.",
  CHANGELOG:
    "A starting changelog for tracking notable project changes.",
  ISSUE_TEMPLATE_BUG:
    "A structured GitHub issue template for reproducible bug reports.",
  ISSUE_TEMPLATE_FEATURE:
    "A structured GitHub issue template for feature suggestions.",
  PULL_REQUEST_TEMPLATE:
    "A pull request template with summary, testing, and checklist sections.",
};

export const GENERATABLE_DOCUMENT_TYPES: readonly DocumentType[] = [
  "CONTRIBUTING",
  "CODE_OF_CONDUCT",
  "SECURITY",
  "CHANGELOG",
  "ISSUE_TEMPLATE_BUG",
  "ISSUE_TEMPLATE_FEATURE",
  "PULL_REQUEST_TEMPLATE",
];

export function getDocumentDestinationPath(documentType: DocumentType): string {
  return DOCUMENT_DESTINATION_PATHS[documentType];
}

export function getDocumentDisplayName(documentType: DocumentType): string {
  return DOCUMENT_DISPLAY_NAMES[documentType];
}
