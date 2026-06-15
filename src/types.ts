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
  status: "idle" | "processing" | "success" | "error";
  errorMsg?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
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
