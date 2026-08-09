import type { AIFactsPayload } from "./aiFactsPayload";

export interface AIMarkdownValidationResult {
  isValid: boolean;
  warnings: string[];
  rejectionReason: string | null;
}

const PLACEHOLDER_PATTERNS = [
  /\{\{[^}]+\}\}/,
  /\[INSERT[^\]]*\]/i,
  /\[YOUR[^\]]*\]/i,
  /\[TODO:?[^\]]*\]/i,
  /<<[^>]+>>/,
  /XXX/,
];

const SHELL_CODE_BLOCK_PATTERN = /```(?:bash|sh|shell|console|zsh)\s*\n([\s\S]*?)```/gi;
const PATH_PATTERN = /(?:^|\s|`)(\.[/\w.-]+)(?:`|\s|$)/gm;

function isEffectivelyEmpty(markdown: string): boolean {
  const stripped = markdown.replace(/<!--[\s\S]*?-->/g, "").trim();
  return stripped.length === 0;
}

function hasUnresolvedPlaceholders(markdown: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(markdown));
}

function extractShellCommands(markdown: string): string[] {
  const commands: string[] = [];
  let match: RegExpExecArray | null;

  SHELL_CODE_BLOCK_PATTERN.lastIndex = 0;

  while ((match = SHELL_CODE_BLOCK_PATTERN.exec(markdown)) !== null) {
    const block = match[1];

    for (const line of block.split("\n")) {
      const trimmed = line.trim();

      if (
        trimmed.length > 0 &&
        !trimmed.startsWith("#") &&
        !trimmed.startsWith("$")
      ) {
        commands.push(trimmed);
      } else if (trimmed.startsWith("$")) {
        commands.push(trimmed.slice(1).trim());
      }
    }
  }

  return commands;
}

function commandUsesUnexpectedPackageManager(
  command: string,
  packageManager: string | null,
): boolean {
  if (packageManager === null) {
    return false;
  }

  const lower = command.toLowerCase();

  if (packageManager === "npm") {
    return (
      /\bpnpm\s+(install|run|test)\b/.test(lower) ||
      /\byarn\s+(install|run|test)\b/.test(lower)
    );
  }

  if (packageManager === "pnpm") {
    return (
      /\bnpm\s+(install|run|test)\b/.test(lower) ||
      /\byarn\s+(install|run|test)\b/.test(lower)
    );
  }

  if (packageManager === "yarn") {
    return (
      /\bnpm\s+(install|run|test)\b/.test(lower) ||
      /\bpnpm\s+(install|run|test)\b/.test(lower)
    );
  }

  return false;
}

function isTestCommand(command: string): boolean {
  const lower = command.toLowerCase();
  return (
    lower.includes(" test") ||
    lower.startsWith("test ") ||
    lower.includes(" pytest") ||
    lower.includes(" go test") ||
    lower.includes(" cargo test") ||
    lower.includes(" npm test") ||
    lower.includes(" yarn test") ||
    lower.includes(" pnpm test") ||
    lower.includes(" npm run test") ||
    lower.includes(" yarn run test") ||
    lower.includes(" pnpm run test")
  );
}

function isInstallCommand(command: string): boolean {
  const lower = command.toLowerCase();
  return (
    lower.includes(" install") ||
    lower.includes(" npm ci") ||
    lower.includes(" yarn install") ||
    lower.includes(" pnpm install")
  );
}

function detectSuspiciousCommands(
  markdown: string,
  facts: AIFactsPayload,
): string[] {
  const warnings: string[] = [];
  const commands = extractShellCommands(markdown);

  for (const command of commands) {
    if (
      commandUsesUnexpectedPackageManager(command, facts.packageManager)
    ) {
      warnings.push(
        `RepoReady could not verify this command against repository facts: \`${command}\` (unexpected package manager).`,
      );
      continue;
    }

    if (isTestCommand(command) && facts.testCommand === null) {
      warnings.push(
        `RepoReady could not verify this command against repository facts: \`${command}\` (no test command detected in the repository).`,
      );
      continue;
    }

    if (isInstallCommand(command) && facts.installCommand === null) {
      warnings.push(
        `RepoReady could not verify this command against repository facts: \`${command}\` (no install command detected in the repository).`,
      );
    }
  }

  return warnings;
}

function normalizePath(path: string): string {
  return path.replace(/^\.\//, "").replace(/\/$/, "");
}

function pathExistsInRepository(path: string, facts: AIFactsPayload): boolean {
  const normalized = normalizePath(path);

  if (normalized.length === 0 || normalized === ".") {
    return true;
  }

  const knownPaths = new Set(
    facts.relevantPaths
      .filter((entry) => !entry.startsWith("…"))
      .map(normalizePath),
  );

  if (knownPaths.has(normalized)) {
    return true;
  }

  for (const known of knownPaths) {
    if (known.startsWith(`${normalized}/`) || normalized.startsWith(`${known}/`)) {
      return true;
    }
  }

  return false;
}

function detectSuspiciousPaths(
  markdown: string,
  facts: AIFactsPayload,
): string[] {
  const warnings: string[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  PATH_PATTERN.lastIndex = 0;

  while ((match = PATH_PATTERN.exec(markdown)) !== null) {
    const path = match[1];

    if (seen.has(path)) {
      continue;
    }

    seen.add(path);

    if (!path.includes("/") && !path.startsWith("./")) {
      continue;
    }

    if (!pathExistsInRepository(path, facts)) {
      warnings.push(
        `This referenced file path was not detected in the repository: \`${path}\`.`,
      );
    }
  }

  return warnings;
}

function hasMalformedMarkdown(markdown: string): boolean {
  const fenceCount = (markdown.match(/```/g) ?? []).length;
  return fenceCount % 2 !== 0;
}

export function validateAIMarkdown(
  markdown: string,
  facts: AIFactsPayload,
): AIMarkdownValidationResult {
  const warnings: string[] = [];

  if (isEffectivelyEmpty(markdown)) {
    return {
      isValid: false,
      warnings: [],
      rejectionReason: "OpenAI returned an empty document response.",
    };
  }

  if (hasMalformedMarkdown(markdown)) {
    warnings.push("The generated Markdown may contain unclosed code fences.");
  }

  if (hasUnresolvedPlaceholders(markdown)) {
    warnings.push(
      "The generated draft contains unresolved placeholder markers that may need manual review.",
    );
  }

  warnings.push(...detectSuspiciousCommands(markdown, facts));
  warnings.push(...detectSuspiciousPaths(markdown, facts));

  return {
    isValid: true,
    warnings,
    rejectionReason: null,
  };
}
