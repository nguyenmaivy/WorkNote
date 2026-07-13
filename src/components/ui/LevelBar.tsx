import React, { useMemo, useRef, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Zap } from "lucide-react";
import type { UploadedFile } from "../../types";

/** Mỗi tài liệu xử lý thành công = 50 XP. Mỗi cấp cần 100 XP. */
const XP_PER_FILE = 50;
const XP_PER_LEVEL = 100;

interface LevelBarProps {
  files: UploadedFile[];
}

/**
 * Thanh Level/EXP gọn ở header — gamification "rẻ" mà hiệu quả.
 * EXP suy ra từ số tài liệu đã xử lý thành công (không cần state mới).
 */
export function LevelBar({ files }: LevelBarProps) {
  const { level, intoLevel, pct } = useMemo(() => {
    const successCount = files.filter((f) => f.status === "success").length;
    const xp = successCount * XP_PER_FILE;
    const level = Math.floor(xp / XP_PER_LEVEL) + 1;
    const intoLevel = xp % XP_PER_LEVEL;
    return { level, intoLevel, pct: (intoLevel / XP_PER_LEVEL) * 100 };
  }, [files]);

  // Nảy nhẹ khi lên cấp
  const prevLevel = useRef(level);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (level > prevLevel.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 600);
      return () => clearTimeout(t);
    }
    prevLevel.current = level;
  }, [level]);

  return (
    <div className="flex items-center gap-2" title={`Cấp ${level} • ${intoLevel}/${XP_PER_LEVEL} XP`}>
      <motion.div
        animate={bump ? { scale: [1, 1.25, 1] } : { scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex items-center gap-1 text-[12px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded-full py-1 px-2.5"
      >
        <Zap size={12} className="fill-current" />
        <span>Lv {level}</span>
      </motion.div>

      {/* Thanh tiến trình — ẩn trên màn hình rất nhỏ */}
      <div className="hidden sm:flex items-center gap-1.5">
        <div className="relative w-20 h-2 rounded-full bg-[var(--color-neutral-soft)] overflow-hidden">
          <motion.div
            className="xp-shimmer relative h-full rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[#a855f7]"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          />
        </div>
        <span className="text-[11px] font-mono font-medium text-[var(--color-text-secondary)] tabular-nums">
          {intoLevel}/{XP_PER_LEVEL}
        </span>
      </div>
    </div>
  );
}
