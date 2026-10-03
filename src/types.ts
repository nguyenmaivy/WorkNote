export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  userAnswer?: string;
}

export interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
  collapsed?: boolean;
  icon?: string;           // emoji hoặc icon identifier
  notes?: string;          // ghi chú chi tiết cho node
  color?: string;          // override color cho node
  sourceIds?: string[];    // nguồn Library/NotebookLM tạo ra node
}

export interface MindMapMeta {
  provider: string;
  model: string;
  sourceHash: string;
  generatedAt: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  base64Data?: string;
  summary?: string;
  extractedText?: string;
  quiz?: QuizQuestion[];
  mindmap?: MindMapNode;
  mindmapMeta?: MindMapMeta;
  status: "idle" | "processing" | "success" | "error";
  errorMsg?: string;
  sourceUrl?: string; // URL gốc nếu file được nạp từ link — để "Thử lại" chạy lại được
  blob?: Blob;        // dữ liệu file gốc (để nghe lại & lưu vào IndexedDB)
  objectUrl?: string; // URL tạm phát lại file gốc — KHÔNG lưu, tạo lại từ blob mỗi lần nạp
  createdAt?: number; // mốc thời gian thêm file — dùng để sắp xếp khi nạp lại
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  provider?: "local" | "gemini" | "openrouter" | "groq";
  model?: string;
}

export type TechTopicId =
  | "multiplatform_compile"
  | "qr_scanning"
  | "expo_tunneling"
  | "vietnamese_nlp"
  | "secure_pdf_ocr"
  | "nlp_promptless"
  | "formatting_translate"
  | "image_ocr_flow";

export interface TechTopic {
  id: TechTopicId;
  title: string;
  category: string;
  question: string;
  explanation: string;
  visualCode?: string;
  diagramSteps?: { title: string; desc: string; icon: string }[];
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiStatusResponse {
  success: boolean;
  isDemo: boolean;
}

export interface ProcessFileResponse {
  success: boolean;
  isDemo?: boolean;
  name?: string;
  mimeType?: string;
  size?: number;
  summary: string;
  extractedText: string;
  quiz: QuizQuestion[];
  mindmap: MindMapNode;
}

export interface ChatResponse {
  success: boolean;
  reply: string;
}

export interface TTSResponse {
  success: boolean;
  isDemo?: boolean;
  region: string;
  base64Audio?: string;
  mimeType?: string;
  message?: string;
}

export interface TranslateResponse {
  success: boolean;
  isDemo?: boolean;
  translatedText: string;
}

export interface LiveAudioTranslateResponse {
  success: boolean;
  isDemo?: boolean;
  transcription: string;
  translation: string;
  translatedText?: string;
}

export type AccentRegion = "north" | "central" | "south";

export type TabId =
  | "upload"
  | "chat"
  | "mindmap"
  | "game"
  | "audiolab"
  | "knowledge"
  | "budget"
  | "notebook";

// ─── NotebookLM Data Model (WP01) ───────────────────────────────────────────

export type NotebookSourceType = "document" | "url" | "transcript" | "youtube" | "text";

export interface NotebookSource {
  id: string;
  type: NotebookSourceType;
  title: string;
  content: string;
  origin?: string;
  tokenCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotebookPage {
  id: string;
  title: string;
  content: string;
  sourceIds: string[];
  metadata?: Record<string, string>;
  mindmap?: MindMapNode;
  mindmapMeta?: MindMapMeta;
  createdAt: string;
  updatedAt: string;
}

export interface NotebookSearchSnippet {
  sourceId: string;
  title: string;
  snippet: string;
  score: number;
}

export interface NotebookChatResponse {
  success: boolean;
  reply: string;
  provider?: "local" | "gemini" | "openrouter" | "groq";
  model?: string;
  snippets?: NotebookSearchSnippet[];
  isDemo?: boolean;
}

export interface NotebookSummaryResponse {
  success: boolean;
  summary: string;
  provider?: "local" | "gemini" | "openrouter" | "groq";
  model?: string;
  isDemo?: boolean;
}

export interface NotebookQuizResponse {
  success: boolean;
  quiz: QuizQuestion[];
  provider?: "local" | "gemini" | "openrouter" | "groq";
  model?: string;
  isDemo?: boolean;
}

export interface NotebookPagesResponse {
  success: boolean;
  pages: NotebookPage[];
}

export interface NotebookPageResponse {
  success: boolean;
  page: NotebookPage;
}

export interface NotebookSourcesResponse {
  success: boolean;
  sources: NotebookSource[];
}

export interface NotebookSourceResponse {
  success: boolean;
  source: NotebookSource;
}

export interface NotebookSearchResponse {
  success: boolean;
  snippets: NotebookSearchSnippet[];
}

export interface MindMapGenerationResponse {
  success: boolean;
  mindmap: MindMapNode;
  provider: "local" | "gemini" | "openrouter" | "groq";
  model: string;
  sourceHash: string;
  stats: {
    sourceCount: number;
    totalChunks: number;
    analyzedChunks: number;
    sampled: boolean;
  };
}

export type TranslateSourceField = "summary" | "extractedText";
