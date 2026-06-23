import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  /** Nội dung văn bản sẽ được sao chép vào clipboard */
  text?: string;
  /** Nhãn hiển thị khi chưa sao chép */
  label?: string;
  className?: string;
}

/** Nút sao chép nhỏ gọn, hiện trạng thái "Đã chép!" trong ~1.6s sau khi bấm */
export function CopyButton({ text, label = "Sao chép", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text?.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback cho trình duyệt cũ / context không có clipboard API
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!text?.trim()}
      className={`text-[12px] font-medium flex items-center gap-1 transition-colors disabled:opacity-40 ${
        copied
          ? "text-[var(--color-success)]"
          : "text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
      } ${className}`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Đã chép!" : label}
    </button>
  );
}
