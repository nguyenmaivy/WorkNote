import React from "react";

/**
 * Lightweight markdown → React renderer (no dependencies).
 * Handles the subset used across the app's AI output: #..###### headings,
 * **bold**, *italic* / _italic_, `code`, [links](url), bullet & numbered lists,
 * > blockquotes, and --- horizontal rules. Everything else renders as text.
 */

// Inline: bold / italic / code / links → React nodes.
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern =
    /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|_([^_\n]+)_|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/;
  let remaining = text;
  let k = 0;
  while (remaining) {
    const m = remaining.match(pattern);
    if (!m || m.index === undefined) {
      nodes.push(remaining);
      break;
    }
    if (m.index > 0) nodes.push(remaining.slice(0, m.index));
    if (m[2] !== undefined || m[3] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b${k++}`} className="font-semibold text-[var(--color-text-primary)]">
          {m[2] ?? m[3]}
        </strong>
      );
    } else if (m[4] !== undefined || m[5] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-i${k++}`}>{m[4] ?? m[5]}</em>);
    } else if (m[6] !== undefined) {
      nodes.push(
        <code
          key={`${keyPrefix}-c${k++}`}
          className="px-1 py-0.5 rounded bg-[var(--color-neutral-soft)] text-[0.88em] font-mono text-[var(--color-text-primary)]"
        >
          {m[6]}
        </code>
      );
    } else if (m[7] !== undefined) {
      nodes.push(
        <a
          key={`${keyPrefix}-l${k++}`}
          href={m[8]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-primary)] underline hover:opacity-80"
        >
          {m[7]}
        </a>
      );
    }
    remaining = remaining.slice(m.index + m[0].length);
  }
  return nodes;
}

interface MarkdownProps {
  text?: string;
  className?: string;
}

export function Markdown({ text = "", className = "" }: MarkdownProps) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const HEADING_SIZE = ["text-[20px]", "text-[18px]", "text-[16px]", "text-[15px]", "text-[14px]", "text-[13px]"];

  const pushList = (items: string[], ordered: boolean) => {
    const Tag = (ordered ? "ol" : "ul") as keyof React.JSX.IntrinsicElements;
    blocks.push(
      <Tag
        key={`l${key++}`}
        className={`my-2 pl-5 space-y-1 ${ordered ? "list-decimal" : "list-disc"} marker:text-[var(--color-text-secondary)]`}
      >
        {items.map((it, idx) => (
          <li key={idx} className="leading-relaxed pl-0.5">
            {renderInline(it, `li${key}-${idx}`)}
          </li>
        ))}
      </Tag>
    );
  };

  const isBlockStart = (l: string) =>
    /^#{1,6}\s/.test(l) ||
    /^\s*>\s?/.test(l) ||
    /^\s*[-*+]\s+/.test(l) ||
    /^\s*\d+\.\s+/.test(l) ||
    /^\s*([-*_])\1{2,}\s*$/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const Tag = `h${Math.min(level, 6)}` as keyof React.JSX.IntrinsicElements;
      blocks.push(
        <Tag
          key={`h${key++}`}
          className={`font-semibold text-[var(--color-text-primary)] ${HEADING_SIZE[level - 1]} mt-3 mb-1.5 first:mt-0`}
        >
          {renderInline(h[2], `h${key}`)}
        </Tag>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push(<hr key={`hr${key++}`} className="my-3 border-[var(--color-border-subtle)]" />);
      i++;
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={`q${key++}`}
          className="border-l-2 border-[var(--color-primary)] pl-3 my-2 text-[var(--color-text-secondary)] italic"
        >
          {renderInline(quote.join(" "), `q${key}`)}
        </blockquote>
      );
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      pushList(items, false);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      pushList(items, true);
      continue;
    }

    // Paragraph (join consecutive plain lines)
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={`p${key++}`} className="my-1.5 leading-relaxed">
        {renderInline(para.join(" "), `p${key}`)}
      </p>
    );
  }

  return <div className={className}>{blocks}</div>;
}
