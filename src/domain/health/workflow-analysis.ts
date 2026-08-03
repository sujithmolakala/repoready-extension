export const RECOGNIZED_TEST_COMMANDS = [
  "npm test",
  "npm run test",
  "pnpm test",
  "yarn test",
  "pytest",
  "go test",
  "cargo test",
  "mvn test",
  "gradle test",
  "./gradlew test",
] as const;

export function contentIncludesTestCommand(content: string): boolean {
  return RECOGNIZED_TEST_COMMANDS.some((command) => content.includes(command));
}

export function loadedWorkflowContents(
  workflowFiles: readonly { content: string | null }[],
): string[] {
  return workflowFiles
    .map((file) => file.content)
    .filter((content): content is string => content !== null);
}
