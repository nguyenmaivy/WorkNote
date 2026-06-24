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
  /** Short label shown in the sidebar */
  label: string;
  /** Full hero heading shown above the page content */
  pageTitle: string;
  icon: LucideIcon;
  /** Subtitle shown under the hero heading */
  desc: string;
  /** If true, App.tsx skips the page header + paddings; component fills viewport */
  fullBleed?: boolean;
}

export const TABS: TabConfig[] = [
  {
    id: "upload",
    label: "Library",
    pageTitle: "Document Library",
    icon: FileText,
    desc: "Upload, organize, and extract text from your study materials.",
  },
  {
    id: "chat",
    label: "AI Chatbot",
    pageTitle: "Gemini AI Assistant",
    icon: MessageSquare,
    desc: "Chat with AI grounded in your active document — ask questions, summarize, translate, on demand.",
    fullBleed: true,
  },
  {
    id: "mindmap",
    label: "Mind Maps",
    pageTitle: "AI-Powered Mind Map Editor",
    icon: Network,
    desc: "Visualize your knowledge as a hierarchical tree — expand, collapse, and edit branches directly.",
  },
  {
    id: "game",
    label: "RPG Games",
    pageTitle: "Academic RPG Lobby",
    icon: Gamepad2,
    desc: "Review knowledge through an integrated 2D RPG game with quizzes generated from your materials.",
  },
  {
    id: "audiolab",
    label: "Audio Lab",
    pageTitle: "Multilingual Audio Lab",
    icon: Mic,
    desc: "Advanced AI-driven Text-to-Speech synthesis and real-time translation focusing on regional Vietnamese dialects.",
  },
  {
    id: "knowledge",
    label: "Knowledge",
    pageTitle: "Knowledge Hub",
    icon: BookOpen,
    desc: "Welcome back, Scholar. Explore our deep learning resources and start your next technical mastery path or document analysis.",
  },
  {
    id: "budget",
    label: "Spending",
    pageTitle: "Student Spending Diary",
    icon: PiggyBank,
    desc: "Manage personal finances, track spending, and visualize your study savings fund.",
  },
];

// ─── Supported Languages ──────────────────────────────────────────────────────

export interface LanguageOption {
  code: string;
  label: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "vi", label: "Vietnamese" },
  { code: "en", label: "English" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "fr", label: "French" },
];

/**
 * Map code → display name.
 */
export const LANGUAGE_NAME_MAP: Record<string, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l.label])
);

// ─── Accent / Dialect Options ─────────────────────────────────────────────────

export interface AccentOption {
  value: AccentRegion;
  label: string;
  emoji: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { value: "north", label: "Northern (Hanoi)", emoji: "🎤" },
  { value: "central", label: "Central (Huế)", emoji: "🎙️" },
  { value: "south", label: "Southern (Saigon)", emoji: "📣" },
];

// ─── Quick Chat Chips ─────────────────────────────────────────────────────────

export interface QuickChip {
  label: string;
  prompt: string;
}

export const QUICK_CHAT_CHIPS: QuickChip[] = [
  {
    label: "📝 Quick summary",
    prompt: "Give me a concise bullet-point summary of this lesson.",
  },
  {
    label: "🌐 Translate to Vietnamese",
    prompt:
      "Translate this lesson into Vietnamese, preserving all bullet points, list structure, and headings exactly.",
  },
  {
    label: "🎤 3-region pronunciation",
    prompt:
      "Analyze in detail the differences in pronunciation and tone of Vietnamese between the three regions: North, Central, and South.",
  },
  {
    label: "🧙‍♂️ Generate quiz",
    prompt:
      "Generate 3 multiple-choice review questions with the correct answer and a brief explanation for each, based on this lesson.",
  },
];

// ─── Supported File Types ───────────────────────────────────────────────────────

export const SUPPORTED_FILE_TYPES = {
  extensions: [".pdf", ".txt", ".md", ".csv", ".docx", ".xlsx", ".png", ".jpg", ".jpeg", ".mp3", ".wav"],
  accept:
    "application/pdf, text/plain, text/markdown, text/csv, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, image/png, image/jpeg, audio/mpeg, audio/wav",
};
