interface GitHubAuthDiagnosticLog {
  phase: string;
  requestSent: boolean;
  httpStatus?: number;
  contentType?: string | null;
  jsonParseSucceeded?: boolean;
  topLevelFieldNames?: string[];
  loginExists?: boolean;
  loginType?: string;
  mappedErrorCode?: string;
}

export function logGitHubAuthDiagnostic(log: GitHubAuthDiagnosticLog): void {
  console.info("[RepoReady Auth Diagnostic]", log);
}

export function getTopLevelFieldNames(value: unknown): string[] {
  if (typeof value !== "object" || value === null) {
    return [];
  }

  return Object.keys(value);
}

export function getLoginType(value: unknown): string {
  if (typeof value !== "object" || value === null || !("login" in value)) {
    return "missing";
  }

  const record = value as Record<string, unknown>;
  return typeof record.login;
}
