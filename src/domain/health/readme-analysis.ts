const SETUP_HEADING_PATTERNS = [
  "installation",
  "install",
  "setup",
  "getting started",
  "quick start",
  "quickstart",
] as const;

const USAGE_HEADING_PATTERNS = [
  "usage",
  "example",
  "examples",
  "basic usage",
  "how to use",
] as const;

const TESTING_HEADING_PATTERNS = ["test", "testing"] as const;

const TEST_COMMANDS = [
  "npm test",
  "npm run test",
  "pnpm test",
  "yarn test",
  "pytest",
  "go test",
  "cargo test",
  "mvn test",
  "gradle test",
] as const;

const HEADING_PATTERN = /^ {0,3}#{1,6}\s+(.+?)(?:\s+#+\s*)?$/gm;

export function extractMarkdownHeadings(content: string): string[] {
  const headings: string[] = [];

  for (const match of content.matchAll(HEADING_PATTERN)) {
    const headingText = match[1].trim();

    if (headingText.length > 0) {
      headings.push(normalizeHeading(headingText));
    }
  }

  return headings;
}

export function hasMarkdownHeading(
  content: string,
  patterns: readonly string[],
): boolean {
  const headings = extractMarkdownHeadings(content);

  return headings.some((heading) =>
    patterns.some((pattern) => heading === normalizeHeading(pattern)),
  );
}

export function hasSetupHeading(content: string): boolean {
  return hasMarkdownHeading(content, SETUP_HEADING_PATTERNS);
}

export function hasUsageHeading(content: string): boolean {
  return hasMarkdownHeading(content, USAGE_HEADING_PATTERNS);
}

export function hasTestingHeading(content: string): boolean {
  return hasMarkdownHeading(content, TESTING_HEADING_PATTERNS);
}

export function hasTestCommandInFencedBlocks(content: string): boolean {
  const fencedBlocks = content.match(/```[\s\S]*?```/g) ?? [];

  for (const block of fencedBlocks) {
    const innerBlock = block
      .replace(/^```[^\n]*\n?/, "")
      .replace(/\n?```$/, "");

    for (const command of TEST_COMMANDS) {
      if (innerBlock.includes(command)) {
        return true;
      }
    }
  }

  return false;
}

export function hasTestingGuidance(content: string): boolean {
  return hasTestingHeading(content) || hasTestCommandInFencedBlocks(content);
}

export function hasDocumentationLink(content: string): boolean {
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

  for (const match of content.matchAll(linkPattern)) {
    const linkText = match[1].toLowerCase();
    const linkTarget = match[2].toLowerCase();

    if (
      /\b(documentation|docs)\b/.test(linkText) ||
      /\b(documentation|docs)\b/.test(linkTarget) ||
      /(?:^|[/.])docs(?:[/?#]|$)/.test(linkTarget)
    ) {
      return true;
    }
  }

  return false;
}

export function wordAppearsInProse(content: string, word: string): boolean {
  const prose = content.replace(HEADING_PATTERN, " ");
  const pattern = new RegExp(`\\b${word}\\b`, "i");

  return pattern.test(prose);
}

function normalizeHeading(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
