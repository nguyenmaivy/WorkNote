import React, { useState } from "react";

function unescapeJsonString(str: string): string {
  return str
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\"/g, '"')
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\");
}

/**
 * Tự động trích xuất nội dung summary nếu text truyền vào vô tình là một chuỗi JSON thô
 * (kể cả khi JSON bị cắt cụt do chạm trần token).
 */
function resolveMarkdownText(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  let s = raw.trim();

  // 1. Nếu bị bọc trong khối code ```json ... ``` hoặc ``` ... ```
  if (s.startsWith("```")) {
    const stripped = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    if (stripped.includes('"summary"')) {
      s = stripped;
    }
  }

  // 2. Nếu chứa cấu trúc JSON {"summary": "..."}
  if (s.startsWith("{") || s.includes('"summary"')) {
    // Thử JSON.parse trực tiếp
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed.summary === "string") {
        return parsed.summary;
      }
    } catch {}

    // Bóc tách bằng regex nếu có field tiếp theo
    const m = s.match(/"summary"\s*:\s*"([\s\S]*?)(?:",\s*"(?:extractedText|quiz|mindmap)"|"\s*})/);
    if (m && m[1]) {
      return unescapeJsonString(m[1]);
    }

    // Cứu hộ khi JSON bị cắt cụt lửng lơ ở cuối
    const sumIdx = s.indexOf('"summary"');
    if (sumIdx !== -1) {
      let content = s.slice(sumIdx + 9).replace(/^\s*:\s*"/, "");
      content = content.replace(/(?:",\s*"(?:extractedText|quiz|mindmap)"[\s\S]*|"\s*}[\s\S]*)$/, "");
      return unescapeJsonString(content);
    }
  }

  return s;
}

// Inline: bold / italic / code / links → React nodes.
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Cải tiến regex để tránh lỗi underscore trong tên file như _2026-07-17_
  const pattern =
    /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|(?<=\s|^)_([^_]+)_(?=\s|$)|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/;
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
        <strong key={`${keyPrefix}-b${k++}`} className="font-bold text-[var(--color-text-primary)]">
          {m[2] ?? m[3]}
        </strong>
      );
    } else if (m[4] !== undefined || m[5] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-i${k++}`} className="italic">{m[4] ?? m[5]}</em>);
    } else if (m[6] !== undefined) {
      nodes.push(
        <code
          key={`${keyPrefix}-c${k++}`}
          className="px-1.5 py-0.5 rounded bg-[var(--color-neutral-soft)] text-[0.88em] font-mono text-[var(--color-primary)] font-medium"
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
          className="text-[var(--color-primary)] underline hover:opacity-80 font-medium"
        >
          {m[7]}
        </a>
      );
    }
    remaining = remaining.slice(m.index + m[0].length);
  }
  return nodes;
}

interface NumberedHeadingMatch {
  number: string;
  title: string;
  body?: string;
}

function matchNumberedHeading(line: string): NumberedHeadingMatch | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // 1. Dạng **1. Tiêu đề:** hoặc **1. Tiêu đề:** Nội dung tiếp theo
  const m1 = trimmed.match(/^\*\*(\d+)[\.\)]\s*(.*?)\*\*(?:\s*[:：]\s*|\s*[:：]?(?:\s+(.*))?$)/);
  if (m1 && m1[2].trim()) {
    let title = m1[2].trim();
    if (!title.endsWith(":") && (trimmed.includes(":**") || trimmed.includes(":** ") || trimmed.includes("**:"))) {
      title += ":";
    }
    const body = m1[3]?.trim() || undefined;
    return { number: m1[1], title, body };
  }

  // 2. Dạng 1. **Tiêu đề:** hoặc 1. **Tiêu đề:** Nội dung tiếp theo
  const m2 = trimmed.match(/^(\d+)[\.\)]\s*\*\*(.*?)\*\*(?:\s*[:：]\s*|\s*[:：]?(?:\s+(.*))?$)/);
  if (m2 && m2[2].trim()) {
    let title = m2[2].trim();
    if (!title.endsWith(":") && (trimmed.includes(":**") || trimmed.includes("**:"))) {
      title += ":";
    }
    const body = m2[3]?.trim() || undefined;
    return { number: m2[1], title, body };
  }

  // 3. Dạng **1.** Tiêu đề: (chỉ in đậm số)
  const m3 = trimmed.match(/^\*\*(\d+)[\.\)]\*\*\s+(.*)$/);
  if (m3 && m3[2].trim()) {
    return { number: m3[1], title: m3[2].trim() };
  }

  // 4. Dạng **Phần 1: Tiêu đề** hoặc **Mục 1: Tiêu đề**
  const m4 = trimmed.match(/^\*\*(Phần|Mục|Bước|Chương|Giai đoạn)\s*(\d+)[:\.]?\s*(.*?)\*\*(?:\s*[:：]?(?:\s+(.*))?$)/i);
  if (m4 && m4[3].trim()) {
    let title = m4[3].trim();
    if (!title.endsWith(":") && trimmed.includes(":")) {
      title += ":";
    }
    const body = m4[4]?.trim() || undefined;
    return { number: `${m4[1]} ${m4[2]}`, title, body };
  }

  return null;
}

interface MarkdownProps {
  text?: string;
  className?: string;
}

export function Markdown({ text = "", className = "" }: MarkdownProps) {
  const cleanText = resolveMarkdownText(text);
  const lines = cleanText.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const pushList = (items: string[], ordered: boolean, start?: number) => {
    if (ordered) {
      blocks.push(
        <ol
          key={`l${key++}`}
          start={start}
          className="my-3 pl-6 space-y-1.5 list-decimal marker:text-[var(--color-primary)] font-medium"
        >
          {items.map((it, idx) => (
            <li key={idx} className="leading-relaxed pl-1 text-[var(--color-text-primary)] font-normal">
              {renderInline(it, `li${key}-${idx}`)}
            </li>
          ))}
        </ol>
      );
    } else {
      blocks.push(
        <ul
          key={`l${key++}`}
          className="my-3 pl-6 space-y-1.5 list-disc marker:text-[var(--color-primary)]"
        >
          {items.map((it, idx) => (
            <li key={idx} className="leading-relaxed pl-1 text-[var(--color-text-primary)]">
              {renderInline(it, `li${key}-${idx}`)}
            </li>
          ))}
        </ul>
      );
    }
  };

  const isBlockStart = (l: string) =>
    /^#{1,6}\s/.test(l) ||
    /^```/.test(l) ||
    /^\s*>\s?/.test(l) ||
    /^\s*[-*+]\s+/.test(l) ||
    matchNumberedHeading(l) !== null ||
    /^\s*\d+[\.\)]\s+/.test(l) ||
    /^\s*([-*_])\1{2,}\s*$/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    // Code block (fenced ```)
    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, "").trim();
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && /^```/.test(lines[i])) {
        i++;
      }
      blocks.push(
        <div key={`cb${key++}`} className="my-3 rounded-lg overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-neutral-soft)]">
          {lang && (
            <div className="px-3 py-1 bg-black/10 dark:bg-white/10 text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-secondary)]">
              {lang}
            </div>
          )}
          <pre className="p-3 text-[13px] font-mono overflow-x-auto text-[var(--color-text-primary)]">
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Heading #
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      if (level === 1) {
        blocks.push(
          <div key={`h${key++}`} className="mt-5 mb-3 border-b border-[var(--color-border-subtle)] pb-2">
            <h1 className="text-[20px] font-bold text-[var(--color-text-primary)] tracking-tight">
              {renderInline(h[2], `h1-${key}`)}
            </h1>
          </div>
        );
      } else if (level === 2) {
        blocks.push(
          <h2 key={`h${key++}`} className="text-[17px] font-bold text-[var(--color-text-primary)] mt-4 mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-4 bg-[var(--color-primary)] rounded-full inline-block"></span>
            {renderInline(h[2], `h2-${key}`)}
          </h2>
        );
      } else if (level === 3) {
        blocks.push(
          <h3 key={`h${key++}`} className="text-[15px] font-semibold text-[var(--color-text-primary)] mt-3.5 mb-1.5">
            {renderInline(h[2], `h3-${key}`)}
          </h3>
        );
      } else {
        const Tag = `h${Math.min(level, 6)}` as keyof React.JSX.IntrinsicElements;
        blocks.push(
          <Tag key={`h${key++}`} className="font-semibold text-[var(--color-text-primary)] text-[14px] mt-2 mb-1">
            {renderInline(h[2], `hn-${key}`)}
          </Tag>
        );
      }
      i++;
      continue;
    }

    // Horizontal rule ---
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push(<hr key={`hr${key++}`} className="my-4 border-[var(--color-border-subtle)]" />);
      i++;
      continue;
    }

    // Blockquote >
    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={`q${key++}`}
          className="border-l-4 border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 pl-3.5 py-1.5 my-3 rounded-r text-[var(--color-text-primary)] italic text-[14px]"
        >
          {renderInline(quote.join(" "), `q${key}`)}
        </blockquote>
      );
      continue;
    }

    // Unordered list (- or * or +)
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      pushList(items, false);
      continue;
    }

    // Numbered section header (**1. Tiêu đề:** / 1. **Tiêu đề:**)
    const secHeading = matchNumberedHeading(line);
    if (secHeading) {
      blocks.push(
        <div
          key={`sec-${key++}`}
          className="text-[15px] sm:text-[16px] text-[var(--color-text-primary)] mt-5 mb-2.5 flex items-start gap-2.5"
        >
          <span className="inline-flex items-center justify-center min-w-[24px] h-[24px] px-1.5 rounded bg-[var(--color-primary)] text-white text-[12px] font-bold mt-0.5 shrink-0 shadow-xs">
            {secHeading.number}
          </span>
          <div className="leading-relaxed flex-1">
            <strong className="font-bold text-[var(--color-text-primary)]">
              {renderInline(secHeading.title, `sec-t-${key}`)}
            </strong>
            {secHeading.body && (
              <span className="font-normal text-[var(--color-text-secondary)] ml-2">
                {renderInline(secHeading.body, `sec-b-${key}`)}
              </span>
            )}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // Ordered list (1. item hoặc 1) item)
    const olMatch = line.match(/^\s*(\d+)[\.\)]\s+(.*)$/);
    if (olMatch) {
      const startNum = parseInt(olMatch[1], 10);
      const items: string[] = [];
      while (i < lines.length) {
        const cur = lines[i];
        if (matchNumberedHeading(cur)) break;
        const curMatch = cur.match(/^\s*\d+[\.\)]\s+(.*)$/);
        if (!curMatch) break;

        let itemText = curMatch[1];
        // Loại bỏ số thứ tự bị trùng bên trong nội dung (ví dụ: "1. **1. Tiêu đề**" hoặc "1. 1. Tiêu đề")
        itemText = itemText
          .replace(/^\s*\*\*(\d+)[\.\)]\s*(.*?)\*\*/, "**$2**")
          .replace(/^\s*(\d+)[\.\)]\s+/, "");

        items.push(itemText);
        i++;
      }
      pushList(items, true, isNaN(startNum) ? 1 : startNum);
      continue;
    }

    // Paragraph (join consecutive plain lines)
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={`p${key++}`} className="my-2 leading-relaxed text-[var(--color-text-secondary)]">
        {renderInline(para.join(" "), `p${key}`)}
      </p>
    );
  }

  return <div className={`space-y-1 ${className}`}>{blocks}</div>;
}
