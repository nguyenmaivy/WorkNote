import {
  FileText,
  MessageSquare,
  Network,
  Gamepad2,
  Mic,
  BookOpen,
  PiggyBank,
} from "lucide-react";
import type { TabId, AccentRegion } from "../types";
import type { LucideIcon } from "lucide-react";

// ─── Tab Navigation ───────────────────────────────────────────────────────────

export interface TabConfig {
  id: TabId;
  label: string;
  icon: LucideIcon;
  desc: string;
}

export const TABS: TabConfig[] = [
  { id: "upload", label: "Tài Liệu & OCR", icon: FileText, desc: "Tải file & bóc tách" },
  { id: "chat", label: "Trợ Lý AI", icon: MessageSquare, desc: "Hỏi đáp ngữ cảnh" },
  { id: "mindmap", label: "Sơ Đồ Tư Duy", icon: Network, desc: "Cây phẳng phân tầng" },
  { id: "game", label: "Trò Chơi 2D & Quiz", icon: Gamepad2, desc: "Vui chơi ôn bài" },
  { id: "audiolab", label: "Lab Âm Thanh", icon: Mic, desc: "Ghi âm & TTS" },
  { id: "knowledge", label: "Thư Viện Kỹ Thuật", icon: BookOpen, desc: "Giải đáp 8 chuyên mục" },
  { id: "budget", label: "Sổ Chi Tiêu & Tiết Kiệm", icon: PiggyBank, desc: "Quản lý chi tiêu học tập" },
];

// ─── Supported Languages ──────────────────────────────────────────────────────

export interface LanguageOption {
  code: string;
  label: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "vi", label: "Tiếng Việt (Vietnamese)" },
  { code: "en", label: "Tiếng Anh (English)" },
  { code: "ja", label: "Tiếng Nhật (Japanese)" },
  { code: "ko", label: "Tiếng Hàn (Korean)" },
  { code: "zh", label: "Tiếng Trung (Chinese)" },
  { code: "fr", label: "Tiếng Pháp (French)" },
];

/**
 * Map code → Vietnamese display name.
 * Dùng khi cần tra cứu nhanh tên ngôn ngữ từ mã code.
 */
export const LANGUAGE_NAME_MAP: Record<string, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l.label.split(" (")[0]])
);

// ─── Accent / Dialect Options ─────────────────────────────────────────────────

export interface AccentOption {
  value: AccentRegion;
  label: string;
  emoji: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { value: "north", label: "Miền Bắc (Hà Nội)", emoji: "🎤" },
  { value: "central", label: "Miền Trung (Huế)", emoji: "🎙️" },
  { value: "south", label: "Miền Nam (Sài Gòn)", emoji: "📣" },
];

// ─── Quick Chat Chips ─────────────────────────────────────────────────────────

export interface QuickChip {
  label: string;
  prompt: string;
}

export const QUICK_CHAT_CHIPS: QuickChip[] = [
  { label: "📝 Tóm tắt nhanh", prompt: "Hãy làm một tóm tắt bằng các gạch đầu dòng ngắn gọn về bài học này giúp tôi." },
  { label: "🌐 Dịch sang English", prompt: "Hãy dịch tài liệu bài học này sang tiếng Anh và lưu ý giữ nguyên hoàn toàn cấu trúc các gạch đầu dòng, dấu dòng hoặc heading nhé." },
  { label: "🎤 Đọc bằng giọng 3 Miền", prompt: "Hãy phân tích chi tiết sự khác biệt về phát âm và thanh điệu ngữ âm tiếng Việt giữa ba miền Bắc, Trung, Nam." },
  { label: "🧙‍♂️ Tạo đề trắc nghiệm", prompt: "Hãy soạn ra giúp tôi 3 câu hỏi trắc nghiệm ôn tập nhanh có kèm đáp án và lý do giải thích cụ thể dựa trên bài học." },
];

// ─── Supported File Types ───────────────────────────────────────────────────────

export const SUPPORTED_FILE_TYPES = {
  extensions: [".pdf", ".txt", ".md", ".csv", ".docx", ".xlsx", ".png", ".jpg", ".jpeg", ".mp3", ".wav"],
  accept: "application/pdf, text/plain, text/markdown, text/csv, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, image/png, image/jpeg, audio/mpeg, audio/wav"
};
