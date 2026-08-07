export async function copyMarkdownToClipboard(content: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(content);
  } catch {
    throw new Error("Clipboard access is unavailable in this browser context.");
  }
}

export function downloadMarkdownFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
