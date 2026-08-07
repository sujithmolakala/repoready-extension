import { Fragment, type ReactNode } from "react";

type InlinePart =
  | { type: "text"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; label: string; href: string };

function parseInlineMarkdown(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /(`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match = pattern.exec(text);

  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }

    const token = match[0];

    if (token.startsWith("`") && token.endsWith("`")) {
      parts.push({ type: "code", value: token.slice(1, -1) });
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);

      if (linkMatch !== null) {
        parts.push({
          type: "link",
          label: linkMatch[1],
          href: linkMatch[2],
        });
      } else {
        parts.push({ type: "text", value: token });
      }
    }

    lastIndex = match.index + token.length;
    match = pattern.exec(text);
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
}

function renderInlineParts(text: string): ReactNode[] {
  return parseInlineMarkdown(text).map((part, index) => {
    switch (part.type) {
      case "code":
        return (
          <code
            className="rounded bg-slate-900 px-1 py-0.5 font-mono text-xs text-emerald-200"
            key={`code-${String(index)}`}
          >
            {part.value}
          </code>
        );
      case "link":
        return (
          <a
            className="text-sky-300 underline"
            href={part.href}
            key={`link-${String(index)}`}
            rel="noreferrer"
            target="_blank"
          >
            {part.label}
          </a>
        );
      default:
        return <Fragment key={`text-${String(index)}`}>{part.value}</Fragment>;
    }
  });
}

export function SafeMarkdownPreview({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !(lines[index] ?? "").startsWith("```")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }

      blocks.push(
        <pre
          className="mb-2 overflow-x-auto rounded-md bg-slate-900 p-3 font-mono text-xs text-slate-200"
          key={`code-block-${String(blocks.length)}`}
        >
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      index += 1;
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      const level = line.match(/^#+/)?.[0].length ?? 1;
      const text = line.replace(/^#{1,3}\s+/, "");
      const className =
        level === 1
          ? "mb-3 text-lg font-semibold text-slate-100"
          : level === 2
            ? "mb-2 mt-4 text-base font-semibold text-slate-100"
            : "mb-2 mt-3 text-sm font-semibold text-slate-100";
      const HeadingTag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";

      blocks.push(
        <HeadingTag className={className} key={`heading-${String(blocks.length)}`}>
          {text}
        </HeadingTag>,
      );
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];

      while (index < lines.length && /^[-*]\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^[-*]\s+/, ""));
        index += 1;
      }

      blocks.push(
        <ul
          className="mb-2 list-disc space-y-1 pl-5 text-slate-300"
          key={`list-${String(blocks.length)}`}
        >
          {items.map((item, itemIndex) => (
            <li key={`${item}-${String(itemIndex)}`}>{renderInlineParts(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (line.trim().length === 0) {
      index += 1;
      continue;
    }

    blocks.push(
      <p className="mb-2 leading-6 text-slate-300" key={`paragraph-${String(blocks.length)}`}>
        {renderInlineParts(line)}
      </p>,
    );
    index += 1;
  }

  return (
    <div data-testid="draft-markdown-preview">
      {blocks.map((block, blockIndex) => (
        <Fragment key={blockIndex}>{block}</Fragment>
      ))}
    </div>
  );
}
