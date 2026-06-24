import React, { useState, useRef } from "react";
import { UploadedFile } from "../types";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Music,
  Film,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Loader2,
  ArrowRight,
  Link as LinkIcon,
  Bot,
  Trash2,
  MoreVertical,
  Copy,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { SUPPORTED_FILE_TYPES } from "../constants";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface DocUploadSectionProps {
  files: UploadedFile[];
  onAddFile: (file: UploadedFile) => void;
  onUpdateFile: (id: string, updated: Partial<UploadedFile>) => void;
  onDeleteFile: (id: string) => void;
  activeFileId: string | null;
  onSelectActiveFile: (id: string) => void;
}

// ─── Time helpers ───────────────────────────────────────────────────
function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return "just now";
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US");
}

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── File type meta ─────────────────────────────────────────────────
function getFileTypeMeta(mime: string) {
  if (mime.includes("pdf")) {
    return {
      Icon: FileText,
      bg: "bg-[var(--color-error-soft)]",
      fg: "text-[var(--color-error)]",
      label: "PDF",
    };
  }
  if (mime.includes("image") || mime.includes("png") || mime.includes("jpeg") || mime.includes("jpg")) {
    return {
      Icon: ImageIcon,
      bg: "bg-[var(--color-primary-fixed)]",
      fg: "text-[var(--color-primary)]",
      label: "Image",
    };
  }
  if (mime.includes("audio") || mime.includes("mp3") || mime.includes("wav")) {
    return {
      Icon: Music,
      bg: "bg-[var(--color-secondary-container)]",
      fg: "text-[var(--color-on-secondary-container)]",
      label: "Audio",
    };
  }
  if (mime.includes("video") || mime.includes("mp4")) {
    return {
      Icon: Film,
      bg: "bg-[var(--color-tertiary-container)]/30",
      fg: "text-[var(--color-tertiary)]",
      label: "Video",
    };
  }
  return {
    Icon: FileText,
    bg: "bg-[var(--color-surface-container)]",
    fg: "text-[var(--color-text-secondary)]",
    label: "File",
  };
}

export default function DocUploadSection({
  files,
  onAddFile,
  onUpdateFile,
  onDeleteFile,
  activeFileId,
  onSelectActiveFile,
}: DocUploadSectionProps) {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileProgress, setFileProgress] = useState<
    Record<string, { percent: number; stage: string }>
  >({});

  // Web URL link input states
  const [fileUrl, setFileUrl] = useState<string>("");
  const [isFetchingUrl, setIsFetchingUrl] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Menu state for card more-vert action
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Helper presets for students to test IMMEDIATELY with 1 click!
  const presets = [
    {
      id: "preset_1",
      name: "Chuyên Đề Đa Nền Tảng App & Web.pdf",
      size: 1048576,
      mimeType: "application/pdf",
      summary: `### Giáo trình Công Nghệ Đa Nền Tảng (Cross-platform)

Tài liệu hướng dẫn tổng quan cách thiết lập chia sẻ mã nguồn giữa Web và ứng dụng Di động thực tế.

#### Các ý tưởng mấu chốt:
- **Ngôn ngữ chung**: Sử dụng **TypeScript / JavaScript** giúp đồng bộ cấu trúc logic.
- **Framework bao bọc (Wrapper)**: Capacitor, Apache Cordova bao bọc Web App vào Webview di động mở rộng tính năng qua Native Bridge.
- **Biên dịch hợp thể (Native Compiler)**: React Native biên dịch mã React sang Android/iOS UI Elements. Flutter biên dịch Dart thành mã nhị phân hiệu năng tối đa.
- **Một QR Duy nhất**: Định cấu hình Universal Links (iOS) và App Links (Android) để mở trực tiếp App nếu được cài, mở Web SPA nếu chưa cài.`,
      extractedText:
        "Văn bản trích xuất Chuyên Đề Đa Nền Tảng App & Web... Trình bày chi tiết kiến trúc của React Native, Capacitor HTML5, Flutter Dart, Google Play Store API, Apple App Store certificates, Universal Deep Links, và cấu hình AASA.",
      quiz: [
        {
          id: "pq1",
          question:
            "Kỹ thuật bao bọc Web App chạy trong một 'lớp vỏ WebView' trên di động và liên kết phần cứng qua Bridge được gọi là gì?",
          options: [
            "Biên dịch Native Core (React Native)",
            "Ứng dụng Lai bọc ngoài (Capacitor / Cordova Hybrid Framework)",
            "Chạy giả lập Chrome di động thủ công",
            "Công nghệ tin nhắn SMS nhúng mã",
          ],
          correctAnswer: "Ứng dụng Lai bọc ngoài (Capacitor / Cordova Hybrid Framework)",
          explanation:
            "Capacitor/Cordova tạo ra lớp khung WebView chạy mã HTML/JS di động, kết nối camera, danh bạ vật lý qua lớp Native JS Bridge tiện lợi.",
        },
        {
          id: "pq2",
          question:
            "Tại sao công nghệ Deep Linking (Universal Links/App Links) lại tối ưu ưu thế cho mã QR đồng bộ?",
          options: [
            "Nó nén file tài liệu nhỏ đi",
            "Nó tự chặn liên kết HTTPS để đưa ra rẽ nhánh: Có app bóc mở app di động, chưa có app mở tiếp trình duyệt Web di động tức khắc",
            "Nó xóa hoàn toàn trình duyệt Web di động",
            "Nó ép người dùng phải mua điện thoại mới",
          ],
          correctAnswer:
            "Nó tự chặn liên kết HTTPS để đưa ra rẽ nhánh: Có app bóc mở app di động, chưa có app mở tiếp trình duyệt Web di động tức khắc",
          explanation:
            "Deep linking định tuyến link duy nhất. Khi quét QR, nếu máy đã cài ứng dụng thì kích hoạt mở app; chưa cài thì chuyển tiếp mở browser chạy Web App PWA ngay tắp lự.",
        },
      ],
      mindmap: {
        id: "root",
        label: "Phát Triển App / Web Đa Nền Tảng",
        children: [
          {
            id: "m_n1",
            label: "1. Phương pháp Web-to-App",
            children: [
              { id: "m_n1_1", label: "Chạy WebView" },
              { id: "m_n1_2", label: "Framework: Capacitor / Cordova" },
              { id: "m_n1_3", label: "Chi phí nhân lực: Thấp" },
            ],
          },
          {
            id: "m_n2",
            label: "2. Phương pháp Native-first",
            children: [
              { id: "m_n2_1", label: "Mô hình: React Native / Flutter" },
              { id: "m_n2_2", label: "Hiệu năng: Rất Cao" },
              { id: "m_n2_3", label: "Yêu cầu: Mã hóa cấu trúc Gốc" },
            ],
          },
        ],
      },
    },
    {
      id: "preset_2",
      name: "Sách Nói Nhận Diện Phương Ngữ 3 Miền.mp3",
      size: 4194304,
      mimeType: "audio/mp3",
      summary: `### Phân Tích Phương Âm Tiếng Việt (Bắc - Trung - Nam)

Văn bản ghi chép khảo sát và lý thuyết về biến thể ngữ âm của các vùng miền Việt Nam phục vụ cho mô hình huấn luyện giọng nói của Trợ lý thông thái.

#### Tóm lược:
- **Âm sắc thanh điệu**: Miền Bắc phân biệt đủ 6 thanh điệu, miền Nam gộp Hỏi/Ngã thành 1 dấu Hỏi, miền Trung biến âm nặng, có tông nén.
- **Biến đổi phụ âm đầu**: Tiếng miền Nam biến 'r' -> 'g/d' ('con cá rô' thành 'con cá gô'), tiếng miền Bắc đồng nhất phát âm r, d, gi thành '/z/'.`,
      extractedText:
        "Văn bản trích xuất âm học... Nghiên cứu khảo sát f0, formant F1-F2 của giọng nói Hà Nội, Huế, Quảng Nam, Sài Gòn, Cần Thơ. Thách thức lớn của bộ nhận diện giọng nói Whisper/Gemini là các từ vựng địa phương rườm rà và hiện tượng nuốt âm đuôi.",
      quiz: [
        {
          id: "pq3",
          question:
            "Vấn đề biến âm phụ âm nào sau đây thường gặp trong tiếng di sản Nam Bộ của Việt Nam?",
          options: [
            "Đọc 'd/gi/r' đồng tính phát âm là '/z/'",
            "Đọc 'r' và 'v' thành thanh mượt 'g' hoặc 'y' (Ví dụ: Cá rô -> Cá gô, Đi về -> Đi dề)",
            "Chuyển toàn bộ dấu nặng sang dấu hỏi",
            "Không phát âm được chữ cái 'b'",
          ],
          correctAnswer:
            "Đọc 'r' và 'v' thành thanh mượt 'g' hoặc 'y' (Ví dụ: Cá rô -> Cá gô, Đi về -> Đi dề)",
          explanation:
            "Tiếng di sản Nam Bộ giàu tính giản lược mềm mượt, thường thay âm r bằng g, âm v bằng d/y làm biến tính đặc tính STT thô sơ.",
        },
      ],
      mindmap: {
        id: "root",
        label: "Hải Đồ Phương Ngữ Tiếng Việt",
        children: [
          {
            id: "m_s1",
            label: "Miền Bắc (Tonal/Crisp)",
            children: [
              { id: "m_s1_1", label: "Nhận biết đủ 6 dấu" },
              { id: "m_s1_2", label: "Phụ âm r, gi, d -> /z/" },
            ],
          },
          {
            id: "m_s2",
            label: "Miền Nam (Melodic/Fluid)",
            children: [
              { id: "m_s2_1", label: "Hòa lẫn thanh Hỏi & Ngã" },
              { id: "m_s2_2", label: "Phụ âm r -> g / v -> d" },
            ],
          },
        ],
      },
    },
    {
      id: "preset_video",
      name: "But what is a Neural Network? (YouTube)",
      size: 0,
      mimeType: "video/mp4",
      sourceUrl: "https://www.youtube.com/watch?v=aircAruvnKk",
      summary: `### Mạng nơ-ron là gì? — Trực giác hình ảnh

Video giải thích **neural network** bằng ví dụ nhận diện chữ số viết tay. Mạng gồm các **lớp nơ-ron** kết nối nhau; mỗi nơ-ron giữ một con số gọi là **activation**.

#### Ý chính
- Một nơ-ron là một hàm nhận đầu vào từ lớp trước, nhân với **trọng số (weights)**, cộng **độ lệch (bias)** rồi nén qua hàm phi tuyến.
- Các lớp ẩn được kỳ vọng nhận ra các đặc trưng dần phức tạp: nét cạnh → bộ phận → chữ số hoàn chỉnh.
- "Học" nghĩa là tìm bộ weights và bias phù hợp từ dữ liệu huấn luyện.`,
      extractedText:
        "This is a three. It's sloppily rendered at a low resolution, and yet your brain has no trouble recognizing it as a three. " +
        "I want you to take a moment to appreciate how crazy it is that brains do this so effortlessly. " +
        "The same is true for any other handwritten digit you might see. " +
        "Writing a program that takes a grid of pixels and outputs the correct digit is extremely difficult. " +
        "The goal of machine learning is to let the computer figure out the right program from examples. " +
        "A neural network is loosely inspired by the brain. It is made of layers of neurons connected together. " +
        "Each neuron holds a number called its activation, between zero and one. " +
        "The first layer is the pixels of the image, and the last layer represents the ten possible digits. " +
        "The layers in between are called hidden layers, and they do the heavy lifting of recognition. " +
        "Each connection has a weight, and each neuron has a bias that shifts its activation. " +
        "Training means tuning all of those weights and biases so the network gives the right answer.",
      quiz: [
        {
          id: "nv1",
          question: "Con số mà mỗi nơ-ron lưu giữ (từ 0 đến 1) được gọi là gì?",
          options: ["Activation", "Gradient", "Epoch", "Tensor"],
          correctAnswer: "Activation",
          explanation: "Mỗi nơ-ron giữ một 'activation' — mức kích hoạt từ 0 tới 1.",
        },
        {
          id: "nv2",
          question: "Quá trình 'học' của mạng nơ-ron thực chất là gì?",
          options: [
            "Vẽ lại ảnh đầu vào",
            "Điều chỉnh trọng số (weights) và độ lệch (bias)",
            "Tăng số pixel của ảnh",
            "Xóa các lớp ẩn",
          ],
          correctAnswer: "Điều chỉnh trọng số (weights) và độ lệch (bias)",
          explanation: "Huấn luyện = tối ưu weights và bias để mạng cho kết quả đúng.",
        },
      ],
      mindmap: {
        id: "root",
        label: "Neural Network",
        children: [
          {
            id: "nn1",
            label: "Cấu trúc",
            children: [
              { id: "nn1_1", label: "Lớp vào / ẩn / ra" },
              { id: "nn1_2", label: "Nơ-ron giữ activation" },
            ],
          },
          {
            id: "nn2",
            label: "Tham số",
            children: [
              { id: "nn2_1", label: "Weights" },
              { id: "nn2_2", label: "Bias" },
            ],
          },
        ],
      },
    },
  ];

  // ─── Drag & Drop ─────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    Array.from(e.dataTransfer.files).forEach(addFileToWorkspace);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      Array.from(selectedFiles).forEach(addFileToWorkspace);
    }
    e.target.value = "";
  };

  // ─── Progress stage messages (UX flavor) ─────────────────────────
  const getStageMessage = (percent: number, mimeType: string, fileName: string) => {
    const isPdf = mimeType.toLowerCase().includes("pdf");
    const isImage =
      mimeType.toLowerCase().includes("image") || !!fileName.match(/\.(png|jpe?g|webp|gif|bmp)$/i);
    const isAudio =
      mimeType.toLowerCase().includes("audio") || !!fileName.match(/\.(mp3|wav|m4a|ogg|flac)$/i);
    const isVideo =
      mimeType.toLowerCase().includes("video") || !!fileName.match(/\.(mp4|mov|avi|mkv|webm)$/i);

    if (percent < 15) return "Initializing file data and starting binary read...";
    if (percent < 45) {
      if (isPdf) return "Extracting PDF structure and parsing text...";
      if (isImage) return "Running Tesseract OCR scan to extract text...";
      if (isAudio || isVideo) return "Decoding audio stream and running Speech-to-Text...";
      return "Reading plain text file format...";
    }
    if (percent < 75) return "Sending structured payload to Gemini-3.5-flash...";
    if (percent < 90) return "Gemini AI is summarizing and analyzing the content...";
    if (percent < 98) return "Generating mind map nodes and review quiz questions...";
    return "Awaiting final response from the AI service...";
  };

  // ─── Add file & trigger pipeline ─────────────────────────────────
  const addFileToWorkspace = (rawFile: File) => {
    const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newFile: UploadedFile = {
      id,
      name: rawFile.name,
      size: rawFile.size,
      mimeType: rawFile.type || "application/octet-stream",
      status: "idle",
      blob: rawFile,
      createdAt: Date.now(),
    };
    onAddFile(newFile);
    processFileAI(newFile, rawFile);
  };

  // ─── URL link pipeline ──────────────────────────────────────────
  const runLinkPipeline = async (url: string, fileId: string) => {
    const isYoutube = /youtube\.com|youtu\.be/i.test(url);
    const progressMime = isYoutube ? "video/mp4" : "application/pdf";
    const progressName = isYoutube ? "video_youtube.mp4" : "file_tu_link.pdf";

    onUpdateFile(fileId, {
      status: "processing",
      errorMsg: undefined,
      name: isYoutube ? "Fetching YouTube transcript..." : "Downloading remote file...",
    });

    setFileProgress((prev) => ({
      ...prev,
      [fileId]: {
        percent: 10,
        stage: isYoutube
          ? "Connecting to YouTube and pulling captions/transcript..."
          : "Connecting to the remote source...",
      },
    }));

    let currentPercent = 10;
    const progressInterval = setInterval(() => {
      currentPercent += Math.floor(Math.random() * 6) + 2;
      if (currentPercent > 92) currentPercent = 92;
      setFileProgress((prev) => ({
        ...prev,
        [fileId]: {
          percent: currentPercent,
          stage: getStageMessage(currentPercent, progressMime, progressName),
        },
      }));
    }, 700);

    try {
      const res = await fetch("/api/process-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      clearInterval(progressInterval);

      if (data.success) {
        setFileProgress((prev) => ({
          ...prev,
          [fileId]: { percent: 100, stage: "Link processed successfully!" },
        }));
        onUpdateFile(fileId, {
          name: data.name,
          size: data.size || 51200,
          mimeType: data.mimeType || "application/pdf",
          status: "success",
          summary: data.summary,
          extractedText: data.extractedText,
          quiz: data.quiz,
          mindmap: data.mindmap,
        });
        onSelectActiveFile(fileId);
        setFileUrl("");

        setTimeout(() => {
          setFileProgress((prev) => {
            const next = { ...prev };
            delete next[fileId];
            return next;
          });
        }, 3000);
      } else {
        throw new Error(data.error || "Could not download or parse this link.");
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error(err);
      onUpdateFile(fileId, {
        name: isYoutube ? "YouTube link failed" : "URL link failed",
        status: "error",
        errorMsg: err.message || "Download failed. Try a different file or attach it directly.",
      });
      setFileProgress((prev) => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
    }
  };

  const handleImportFromLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUrl || !fileUrl.trim().startsWith("http")) {
      setUrlError("Please enter a valid URL starting with http:// or https://");
      return;
    }
    setUrlError(null);
    setIsFetchingUrl(true);

    const isYoutube = /youtube\.com|youtu\.be/i.test(fileUrl);
    const tempId = `link_${Date.now()}`;
    onAddFile({
      id: tempId,
      name: isYoutube ? "Fetching YouTube transcript..." : "Downloading remote file...",
      size: 0,
      mimeType: isYoutube ? "video/mp4" : "application/pdf",
      status: "processing",
      sourceUrl: fileUrl.trim(),
    });

    try {
      await runLinkPipeline(fileUrl.trim(), tempId);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const retryFile = (file: UploadedFile) => {
    if (file.sourceUrl) runLinkPipeline(file.sourceUrl, file.id);
    else processFileAI(file);
  };

  // ─── AI processing pipeline ──────────────────────────────────────
  const processFileAI = async (file: UploadedFile, rawFile?: File) => {
    if (!rawFile && !file.base64Data) return;

    onUpdateFile(file.id, { status: "processing", errorMsg: undefined });
    setFileProgress((prev) => ({
      ...prev,
      [file.id]: { percent: 5, stage: "Loading file into buffer..." },
    }));

    let currentPercent = 5;
    const progressInterval = setInterval(() => {
      currentPercent += Math.floor(Math.random() * 8) + 3;
      if (currentPercent > 97) currentPercent = 97;
      setFileProgress((prev) => ({
        ...prev,
        [file.id]: {
          percent: currentPercent,
          stage: getStageMessage(currentPercent, file.mimeType, file.name),
        },
      }));
    }, 600);

    try {
      let res;
      if (rawFile) {
        const formData = new FormData();
        formData.append("file", rawFile);
        formData.append("name", file.name);
        formData.append("mimeType", file.mimeType);
        res = await fetch("/api/process-file", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/process-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.mimeType,
            base64Data: file.base64Data,
          }),
        });
      }

      const data = await res.json();
      clearInterval(progressInterval);

      if (data.success) {
        setFileProgress((prev) => ({
          ...prev,
          [file.id]: { percent: 100, stage: "Analysis complete!" },
        }));
        onUpdateFile(file.id, {
          status: "success",
          summary: data.summary,
          extractedText: data.extractedText,
          quiz: data.quiz,
          mindmap: data.mindmap,
        });
        onSelectActiveFile(file.id);

        setTimeout(() => {
          setFileProgress((prev) => {
            const next = { ...prev };
            delete next[file.id];
            return next;
          });
        }, 3000);
      } else {
        throw new Error(data.error || "File analysis failed");
      }
    } catch (e: any) {
      clearInterval(progressInterval);
      console.error(e);
      setFileProgress((prev) => {
        const next = { ...prev };
        delete next[file.id];
        return next;
      });
      onUpdateFile(file.id, {
        status: "error",
        errorMsg: e.message || "Could not reach the AI service. Check your API key.",
      });
    }
  };

  // ─── Preset activation ───────────────────────────────────────────
  const activatePreset = (preset: any) => {
    const workingFile: UploadedFile = {
      id: preset.id,
      name: preset.name,
      size: preset.size,
      mimeType: preset.mimeType,
      summary: preset.summary,
      extractedText: preset.extractedText,
      quiz: preset.quiz,
      mindmap: preset.mindmap,
      sourceUrl: preset.sourceUrl,
      status: "success",
      createdAt: Date.now(),
    };
    onAddFile(workingFile);
    onSelectActiveFile(workingFile.id);
  };

  // ─── Status pill helper (Stitch style: dot + label) ──────────────
  const renderStatusPill = (file: UploadedFile) => {
    if (file.status === "success") {
      const isAudioOrVideo =
        file.mimeType.includes("audio") || file.mimeType.includes("video");
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--color-secondary)]" />
          <span className="text-[11px] text-[var(--color-secondary)] font-medium">
            {isAudioOrVideo ? "Transcribed" : "OCR Complete"}
          </span>
        </div>
      );
    }
    if (file.status === "processing") {
      const pct = fileProgress[file.id]?.percent ?? 0;
      return (
        <div className="flex items-center gap-1.5">
          <Loader2 size={12} className="text-[var(--color-tertiary)] animate-spin" />
          <span className="text-[11px] text-[var(--color-tertiary)] font-medium">
            Processing... {pct}%
          </span>
        </div>
      );
    }
    if (file.status === "error") {
      return (
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={12} className="text-[var(--color-error)]" />
          <span className="text-[11px] text-[var(--color-error)] font-medium">Error</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-[var(--color-warning)]" />
        <span className="text-[11px] text-[var(--color-warning)] font-medium">Queued</span>
      </div>
    );
  };

  const activeFile = files.find((f) => f.id === activeFileId);

  return (
    <div className="space-y-8" id="upload-workspace-section">
      {/* ═══════════════════════════════════════════════════════════
            HERO DROPZONE — full width, dashed border, Stitch style
          ═══════════════════════════════════════════════════════════ */}
      <section
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-[12px] p-8 md:p-10 bg-[var(--color-surface)] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[280px] group ${isDragging
            ? "border-[var(--color-primary)] bg-[var(--color-primary-fixed)]/30 dropzone-active"
            : "border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-low)] hover:border-[var(--color-primary)]"
          }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept={SUPPORTED_FILE_TYPES.accept}
          multiple
        />

        <div
          className={`w-16 h-16 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center mb-4 transition-transform shadow-[var(--shadow-primary-glow)] ${isDragging ? "scale-110 animate-bounce-soft" : "group-hover:scale-110"
            }`}
        >
          <Upload size={28} />
        </div>

        <h3 className="text-[20px] font-semibold text-[var(--color-text-primary)] mb-1 font-display">
          {isDragging ? "Drop to extract! ✨" : "Drag & Drop files here"}
        </h3>
        <p className="text-[15px] text-[var(--color-text-secondary)] mb-5 text-center max-w-md">
          Videos (MP4) or Documents (PDF, PNG, JPG, TXT). Max file size: 50MB.
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="bg-[var(--color-surface)] border border-[var(--color-primary)] text-[var(--color-primary)] text-[14px] font-medium py-2 px-6 rounded-full hover:bg-[var(--color-primary-fixed)]/40 transition-colors"
        >
          Browse Files
        </button>

        {/* Capability chips — match Stitch (2 chips: MP4 + PDF/Images/TXT) */}
        <div
          className="flex flex-wrap justify-center gap-4 mt-6 mb-4 border-t border-[var(--color-outline-variant)]/40 pt-6 w-full max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 bg-[var(--color-surface-container-low)] px-4 py-2.5 rounded-[8px] border border-[var(--color-outline-variant)]/50">
            <Film size={20} className="text-[var(--color-primary)]" />
            <div className="text-left">
              <div className="text-[13px] font-medium text-[var(--color-text-primary)] leading-tight">
                MP4 Files
              </div>
              <div className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                Opens in AI Video Lab
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-[var(--color-surface-container-low)] px-4 py-2.5 rounded-[8px] border border-[var(--color-outline-variant)]/50">
            <FileText size={20} className="text-[var(--color-secondary)]" />
            <div className="text-left">
              <div className="text-[13px] font-medium text-[var(--color-text-primary)] leading-tight">
                PDF / Images / TXT
              </div>
              <div className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                Opens in Analysis Lab
              </div>
            </div>
          </div>
        </div>

        {/* URL Link input */}
        <form
          onSubmit={handleImportFromLink}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-2 mt-2 w-full max-w-md"
        >
          <span className="text-[12px] text-[var(--color-text-secondary)] font-medium">or</span>
          <div className="relative w-full">
            <LinkIcon
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <input
              type="url"
              value={fileUrl}
              onChange={(e) => {
                setFileUrl(e.target.value);
                if (urlError) setUrlError(null);
              }}
              placeholder="Paste a YouTube / PDF / MP3 link here..."
              className="w-full pl-10 pr-12 py-2.5 bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] rounded-[8px] text-[14px] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] outline-none transition-all placeholder:text-[var(--color-text-secondary)]"
            />
            <button
              type="submit"
              disabled={isFetchingUrl || !fileUrl.trim()}
              title="Fetch & analyze link"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--color-primary)] hover:bg-[var(--color-primary-fixed)]/40 rounded-full transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isFetchingUrl ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ArrowRight size={18} />
              )}
            </button>
          </div>
          {urlError && (
            <p className="text-[12px] text-[var(--color-error)] font-medium flex items-center gap-1.5">
              <AlertTriangle size={12} /> {urlError}
            </p>
          )}
        </form>
      </section>

      {/* ═══════════════════════════════════════════════════════════
            MAIN GRID — Recent Documents (2/3) + Preview & OCR (1/3)
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Recent Documents ─────────────────────────── */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-[22px] font-semibold text-[var(--color-text-primary)] font-display">
              Recent Documents
            </h2>
            {files.length > 0 && (
              <button className="text-[14px] font-medium text-[var(--color-primary)] hover:underline">
                View All
              </button>
            )}
          </div>

          {files.length === 0 ? (
            // Empty state — mascot
            <div className="border border-dashed border-[var(--color-outline-variant)] rounded-[12px] glass-tint p-10 text-center flex flex-col items-center">
              <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] shadow-sm rounded-2xl rounded-bl-sm px-4 py-2 text-[13px] font-medium text-[var(--color-text-primary)] max-w-[280px] mb-3">
                Hungry for knowledge — drop a file in the zone above! 🍽️
              </div>
              <div className="animate-mascot-float w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-tertiary)] to-[var(--color-tertiary-container)] flex items-center justify-center text-white shadow-[var(--shadow-primary-glow)]">
                <Bot size={32} />
              </div>
              <p className="text-[16px] font-semibold text-[var(--color-text-primary)] mt-4">
                Your library is empty
              </p>
              <p className="text-[14px] text-[var(--color-text-secondary)] max-w-[320px] mt-1">
                Upload a lesson file or try a sample to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {files.map((file) => {
                const isActive = file.id === activeFileId;
                const meta = getFileTypeMeta(file.mimeType);
                const TypeIcon = meta.Icon;

                return (
                  <div
                    key={file.id}
                    onClick={() => {
                      if (file.status === "success") onSelectActiveFile(file.id);
                    }}
                    className={`relative border rounded-[12px] p-4 bg-[var(--color-surface)] transition-all cursor-pointer flex flex-col gap-2.5 group overflow-hidden ${isActive
                        ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary-fixed)] shadow-[var(--shadow-primary-glow)]"
                        : "border-[var(--color-outline-variant)] hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--color-outline)]"
                      }`}
                  >
                    {/* Top row: icon + more-vert */}
                    <div className="flex justify-between items-start">
                      <div
                        className={`w-10 h-10 rounded-[8px] ${meta.bg} ${meta.fg} flex items-center justify-center`}
                      >
                        <TypeIcon size={20} />
                      </div>
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() =>
                            setOpenMenuId(openMenuId === file.id ? null : file.id)
                          }
                          className="p-1 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-container-low)] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === file.id && (
                          <div className="absolute right-0 top-full mt-1 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-[8px] shadow-[var(--shadow-card-hover)] z-20 min-w-[160px] py-1 animate-fade-in">
                            {file.status === "success" && !isActive && (
                              <button
                                onClick={() => {
                                  onSelectActiveFile(file.id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-3 py-2 text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-container-low)] flex items-center gap-2"
                              >
                                <CheckCircle2 size={14} /> Set Active
                              </button>
                            )}
                            {file.status === "error" && (
                              <button
                                onClick={() => {
                                  retryFile(file);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-3 py-2 text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-container-low)] flex items-center gap-2"
                              >
                                <RefreshCw size={14} /> Retry
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (window.confirm(`Remove "${file.name}" from your library?`)) {
                                  onDeleteFile(file.id);
                                  setOpenMenuId(null);
                                }
                              }}
                              className="w-full text-left px-3 py-2 text-[13px] text-[var(--color-error)] hover:bg-[var(--color-error-soft)] flex items-center gap-2"
                            >
                              <Trash2 size={14} /> Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* File name + size/time */}
                    <div>
                      <h4 className="text-[14px] font-medium text-[var(--color-text-primary)] truncate">
                        {file.name}
                      </h4>
                      <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
                        {formatSize(file.size)} • {formatRelativeTime(file.createdAt)}
                      </p>
                    </div>

                    {/* Status pill at bottom + progress bar if processing */}
                    <div className="mt-auto">
                      {file.status === "processing" && fileProgress[file.id] && (
                        <div className="mb-2">
                          <div className="w-full bg-[var(--color-surface-container-low)] h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-[var(--color-tertiary)] h-full rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${fileProgress[file.id].percent}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        {renderStatusPill(file)}
                        {isActive && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] bg-[var(--color-primary-fixed)] px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      {file.status === "error" && file.errorMsg && (
                        <p className="text-[11px] text-[var(--color-error)] mt-1.5 line-clamp-2">
                          {file.errorMsg}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
