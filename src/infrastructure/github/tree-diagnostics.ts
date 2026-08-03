export function logTreeCollectionDiagnostic(log: {
  stage: string;
  httpStatus?: number;
  errorCode?: string;
  message?: string;
}): void {
  console.info("[RepoReady Tree Diagnostic]", log);
}
