export const TODO_MAINTAINER =
  "<!-- TODO: Add maintainer-specific information -->";

export const TODO_TEST_COMMAND =
  "<!-- TODO: Add the command contributors should use to run tests -->";

export const TODO_CONDUCT_CONTACT =
  "<!-- TODO: Add a private contact method for conduct reports -->";

export const TODO_SECURITY_CONTACT =
  "<!-- TODO: Add a private security reporting contact or process -->";

export const TODO_SUPPORTED_VERSIONS =
  "<!-- TODO: Document which versions receive security updates -->";

export function joinSections(sections: string[]): string {
  return sections.filter((section) => section.length > 0).join("\n\n").trimEnd() + "\n";
}

export function formatCodeBlock(command: string): string {
  return ["```bash", command, "```"].join("\n");
}

export function countTodoComments(markdown: string): number {
  return (markdown.match(/<!-- TODO:/g) ?? []).length;
}

export function collectTodoWarnings(markdown: string): string[] {
  const matches = markdown.match(/<!-- TODO: ([^>]+) -->/g) ?? [];

  return matches.map((match) => match.replace("<!-- ", "").replace(" -->", ""));
}
