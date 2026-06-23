import React, { useState, useRef } from "react";
import { UploadedFile, QuizQuestion, MindMapNode } from "../types";
import { Upload, FileText, Image, Music, Film, CheckCircle2, AlertTriangle, Play, Sparkles, Loader2, ArrowRight, Link, Globe, Bot, Trash2 } from "lucide-react";
import { SUPPORTED_FILE_TYPES } from "../constants";
import { motion } from "motion/react";
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

export default function DocUploadSection({
  files,
  onAddFile,
  onUpdateFile,
  onDeleteFile,
  activeFileId,
  onSelectActiveFile
}: DocUploadSectionProps) {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileProgress, setFileProgress] = useState<Record<string, { percent: number; stage: string }>>({});

  // Web URL link input states
  const [fileUrl, setFileUrl] = useState<string>("");
  const [isFetchingUrl, setIsFetchingUrl] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [uploadTab, setUploadTab] = useState<"file" | "link">("file");

  // Helper presets for students to test IMMEDIATELY with 1 click!
  const presets = [
    {
      id: "preset_1",
      name: "Chuyên Đề Đa Nền Tảng App & Web.pdf",
      size: 1048576, // 1MB
      mimeType: "application/pdf",
      summary: `### Giáo trình Công Nghệ Đa Nền Tảng (Cross-platform)

Tài liệu hướng dẫn tổng quan cách thiết lập chia sẻ mã nguồn giữa Web và ứng dụng Di động thực tế.

#### Các ý tưởng mấu chốt:
- **Ngôn ngữ chung**: Sử dụng **TypeScript / JavaScript** giúp đồng bộ cấu trúc logic.
- **Framework bao bọc (Wrapper)**: Capacitor, Apache Cordova bao bọc Web App vào Webview di động mở rộng tính năng qua Native Bridge.
- **Biên dịch hợp thể (Native Compiler)**: React Native biên dịch mã React sang Android/iOS UI Elements. Flutter biên dịch Dart thành mã nhị phân hiệu năng tối đa.
- **Một QR Duy nhất**: Định cấu hình Universal Links (iOS) và App Links (Android) để mở trực tiếp App nếu được cài, mở Web SPA nếu chưa cài.`,
      extractedText: "Văn bản trích xuất Chuyên Đề Đa Nền Tảng App & Web... Trình bày chi tiết kiến trúc của React Native, Capacitor HTML5, Flutter Dart, Google Play Store API, Apple App Store certificates, Universal Deep Links, và cấu hình AASA.",
      quiz: [
        {
          id: "pq1",
          question: "Kỹ thuật bao bọc Web App chạy trong một 'lớp vỏ WebView' trên di động và liên kết phần cứng qua Bridge được gọi là gì?",
          options: [
            "Biên dịch Native Core (React Native)",
            "Ứng dụng Lai bọc ngoài (Capacitor / Cordova Hybrid Framework)",
            "Chạy giả lập Chrome di động thủ công",
            "Công nghệ tin nhắn SMS nhúng mã"
          ],
          correctAnswer: "Ứng dụng Lai bọc ngoài (Capacitor / Cordova Hybrid Framework)",
          explanation: "Capacitor/Cordova tạo ra lớp khung WebView chạy mã HTML/JS di động, kết nối camera, danh bạ vật lý qua lớp Native JS Bridge tiện lợi."
        },
        {
          id: "pq2",
          question: "Tại sao công nghệ Deep Linking (Universal Links/App Links) lại tối ưu ưu thế cho mã QR đồng bộ?",
          options: [
            "Nó nén file tài liệu nhỏ đi",
            "Nó tự chặn liên kết HTTPS để đưa ra rẽ nhánh: Có app bóc mở app di động, chưa có app mở tiếp trình duyệt Web di động tức khắc",
            "Nó xóa hoàn toàn trình duyệt Web di động",
            "Nó ép người dùng phải mua điện thoại mới"
          ],
          correctAnswer: "Nó tự chặn liên kết HTTPS để đưa ra rẽ nhánh: Có app bóc mở app di động, chưa có app mở tiếp trình duyệt Web di động tức khắc",
          explanation: "Deep linking định tuyến link duy nhất. Khi quét QR, nếu máy đã cài ứng dụng thì kích hoạt mở app; chưa cài thì chuyển tiếp mở browser chạy Web App PWA ngay tắp lự."
        }
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
              { id: "m_n1_3", label: "Chi phí nhân lực: Thấp" }
            ]
          },
          {
            id: "m_n2",
            label: "2. Phương pháp Native-first",
            children: [
              { id: "m_n2_1", label: "Mô hình: React Native / Flutter" },
              { id: "m_n2_2", label: "Hiệu năng: Rất Cao" },
              { id: "m_n2_3", label: "Yêu cầu: Mã hóa cấu trúc Gốc" }
            ]
          }
        ]
      }
    },
    {
      id: "preset_2",
      name: "Sách Nói Nhận Diện Phương Ngữ 3 Miền.mp3",
      size: 4194304, // 4MB
      mimeType: "audio/mp3",
      summary: `### Phân Tích Phương Âm Tiếng Việt (Bắc - Trung - Nam)

Văn bản ghi chép khảo sát và lý thuyết về biến thể ngữ âm của các vùng miền Việt Nam phục vụ cho mô hình huấn luyện giọng nói của Trợ lý thông thái.

#### Tóm lược:
- **Âm sắc thanh điệu**: Miền Bắc phân biệt đủ 6 thanh điệu, miền Nam gộp Hỏi/Ngã thành 1 dấu Hỏi, miền Trung biến âm nặng, có tông nén.
- **Biến đổi phụ âm đầu**: Tiếng miền Nam biến 'r' -> 'g/d' ('con cá rô' thành 'con cá gô'), tiếng miền Bắc đồng nhất phát âm r, d, gi thành '/z/'.`,
      extractedText: "Văn bản trích xuất âm học... Nghiên cứu khảo sát f0, formant F1-F2 của giọng nói Hà Nội, Huế, Quảng Nam, Sài Gòn, Cần Thơ. Thách thức lớn của bộ nhận diện giọng nói Whisper/Gemini là các từ vựng địa phương rườm rà và hiện tượng nuốt âm đuôi.",
      quiz: [
        {
          id: "pq3",
          question: "Vấn đề biến âm phụ âm nào sau đây thường gặp trong tiếng di sản Nam Bộ của Việt Nam?",
          options: [
            "Đọc 'd/gi/r' đồng tính phát âm là '/z/'",
            "Đọc 'r' và 'v' thành thanh mượt 'g' hoặc 'y' (Ví dụ: Cá rô -> Cá gô, Đi về -> Đi dề)",
            "Chuyển toàn bộ dấu nặng sang dấu hỏi",
            "Không phát âm được chữ cái 'b'"
          ],
          correctAnswer: "Đọc 'r' và 'v' thành thanh mượt 'g' hoặc 'y' (Ví dụ: Cá rô -> Cá gô, Đi về -> Đi dề)",
          explanation: "Tiếng di sản Nam Bộ giàu tính giản lược mềm mượt, thường thay âm r bằng g, âm v bằng d/y làm biến tính đặc tính STT thô sơ."
        }
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
              { id: "m_s1_2", label: "Phụ âm r, gi, d -> /z/" }
            ]
          },
          {
            id: "m_s2",
            label: "Miền Nam (Melodic/Fluid)",
            children: [
              { id: "m_s2_1", label: "Hòa lẫn thanh Hỏi & Ngã" },
              { id: "m_s2_2", label: "Phụ âm r -> g / v -> d" }
            ]
          }
        ]
      }
    }
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Process files uploads — hỗ trợ kéo-thả NHIỀU file cùng lúc
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    Array.from(droppedFiles).forEach(addFileToWorkspace);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      Array.from(selectedFiles).forEach(addFileToWorkspace);
    }
    e.target.value = ""; // reset để chọn lại cùng file vẫn kích hoạt onChange
  };

  const getStageMessage = (percent: number, mimeType: string, fileName: string) => {
    const isPdf = mimeType.toLowerCase().includes("pdf");
    const isImage = mimeType.toLowerCase().includes("image") || !!fileName.match(/\.(png|jpe?g|webp|gif|bmp)$/i);
    const isAudio = mimeType.toLowerCase().includes("audio") || !!fileName.match(/\.(mp3|wav|m4a|ogg|flac)$/i);
    const isVideo = mimeType.toLowerCase().includes("video") || !!fileName.match(/\.(mp4|mov|avi|mkv|webm)$/i);

    if (percent < 15) {
      return "Khởi tạo dữ liệu tệp và bắt đầu đọc nhị phân...";
    } else if (percent < 45) {
      if (isPdf) {
        return "Đang trích xuất cấu trúc PDF & bóc tách chữ...";
      } else if (isImage) {
        return "Đang kích hoạt bộ quét ảnh Tesseract OCR trích xuất chữ...";
      } else if (isAudio || isVideo) {
        return "Đang xử lý phân rã luồng âm & nhận dạng Speech-to-Text...";
      } else {
        return "Đang đọc định dạng tệp văn bản thuần...";
      }
    } else if (percent < 75) {
      return "Đang truyền tải cấu trúc dữ liệu sang mô hình gemini-3.5-flash...";
    } else if (percent < 90) {
      return "Gemini AI đang tóm tắt học thuật & phân tích dữ liệu chuyên nghiệp...";
    } else if (percent < 98) {
      return "Đang đồng bộ hóa sơ đồ tư duy & sinh câu hỏi trắc nghiệm ôn tập...";
    } else {
      return "Đang chờ phản hồi xác thực cuối cùng từ hệ thống...";
    }
  };

  const addFileToWorkspace = (rawFile: File) => {
    // id duy nhất kể cả khi thêm nhiều file trong cùng mili-giây
    const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newFile: UploadedFile = {
      id,
      name: rawFile.name,
      size: rawFile.size,
      mimeType: rawFile.type || "application/octet-stream",
      status: "idle",
      blob: rawFile,            // giữ file gốc để nghe lại & lưu IndexedDB
      createdAt: Date.now()
    };

    onAddFile(newFile);
    processFileAI(newFile, rawFile);
  };

  // Lõi xử lý link — tách riêng để cả submit form lẫn "Thử lại" dùng chung
  const runLinkPipeline = async (url: string, fileId: string) => {
    const isYoutube = /youtube\.com|youtu\.be/i.test(url);
    const progressMime = isYoutube ? "video/mp4" : "application/pdf";
    const progressName = isYoutube ? "video_youtube.mp4" : "file_tu_link.pdf";

    onUpdateFile(fileId, {
      status: "processing",
      errorMsg: undefined,
      name: isYoutube ? "Đang lấy transcript từ YouTube..." : "Đang tải tệp trực tuyến...",
    });

    setFileProgress(prev => ({
      ...prev,
      [fileId]: {
        percent: 10,
        stage: isYoutube
          ? "Đang kết nối YouTube và lấy phụ đề / transcript..."
          : "Đang bắt đầu liên kết nguồn tải dữ liệu..."
      }
    }));

    let currentPercent = 10;
    const progressInterval = setInterval(() => {
      currentPercent += Math.floor(Math.random() * 6) + 2;
      if (currentPercent > 92) {
        currentPercent = 92;
      }
      setFileProgress(prev => ({
        ...prev,
        [fileId]: {
          percent: currentPercent,
          stage: getStageMessage(currentPercent, progressMime, progressName)
        }
      }));
    }, 700);

    try {
      const res = await fetch("/api/process-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });

      const data = await res.json();
      clearInterval(progressInterval);

      if (data.success) {
        setFileProgress(prev => ({
          ...prev,
          [fileId]: { percent: 100, stage: "Hoàn tất xử lý tài nguyên liên kết!" }
        }));

        onUpdateFile(fileId, {
          name: data.name,
          size: data.size || 51200,
          mimeType: data.mimeType || "application/pdf",
          status: "success",
          summary: data.summary,
          extractedText: data.extractedText,
          quiz: data.quiz,
          mindmap: data.mindmap
        });

        onSelectActiveFile(fileId);
        setFileUrl("");

        setTimeout(() => {
          setFileProgress(prev => {
            const next = { ...prev };
            delete next[fileId];
            return next;
          });
        }, 3000);
      } else {
        throw new Error(data.error || "Không thể tải hoặc phân tích liên kết.");
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error(err);
      onUpdateFile(fileId, {
        name: isYoutube ? "Lỗi xử lý video YouTube" : "Lỗi liên kết URL",
        status: "error",
        errorMsg: err.message || "Tải tài nguyên thất bại. Hãy thử tệp khác hoặc đính kèm trực tiếp."
      });
      setFileProgress(prev => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
    }
  };

  const handleImportFromLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUrl || !fileUrl.trim().startsWith("http")) {
      setUrlError("Vui lòng nhập đường dẫn liên kết URL hợp lệ bắt đầu bằng http:// hoặc https://");
      return;
    }

    setUrlError(null);
    setIsFetchingUrl(true);

    const isYoutube = /youtube\.com|youtu\.be/i.test(fileUrl);
    const tempId = `link_${Date.now()}`;
    onAddFile({
      id: tempId,
      name: isYoutube ? "Đang lấy transcript từ YouTube..." : "Đang tải tệp trực tuyến...",
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

  // "Thử lại" — chạy lại đúng nguồn: link thì gọi lại pipeline, file upload thì gọi AI
  const retryFile = (file: UploadedFile) => {
    if (file.sourceUrl) {
      runLinkPipeline(file.sourceUrl, file.id);
    } else {
      processFileAI(file);
    }
  };

  // Call the server to process file with AI
  const processFileAI = async (file: UploadedFile, rawFile?: File) => {
    if (!rawFile && !file.base64Data) return;

    onUpdateFile(file.id, { status: "processing", errorMsg: undefined });

    setFileProgress(prev => ({
      ...prev,
      [file.id]: { percent: 5, stage: "Đang nạp file vào bộ nhớ đệm..." }
    }));

    let currentPercent = 5;
    const progressInterval = setInterval(() => {
      currentPercent += Math.floor(Math.random() * 8) + 3;
      if (currentPercent > 97) {
        currentPercent = 97;
      }

      setFileProgress(prev => ({
        ...prev,
        [file.id]: {
          percent: currentPercent,
          stage: getStageMessage(currentPercent, file.mimeType, file.name)
        }
      }));
    }, 600);

    try {
      let res;
      if (rawFile) {
        const formData = new FormData();
        formData.append("file", rawFile);
        formData.append("name", file.name);
        formData.append("mimeType", file.mimeType);

        res = await fetch("/api/process-file", {
          method: "POST",
          body: formData
        });
      } else {
        res = await fetch("/api/process-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.mimeType,
            base64Data: file.base64Data
          })
        });
      }

      const data = await res.json();
      clearInterval(progressInterval);

      if (data.success) {
        setFileProgress(prev => ({
          ...prev,
          [file.id]: { percent: 100, stage: "Hoàn tất phân tích tài nguyên tri thức!" }
        }));

        onUpdateFile(file.id, {
          status: "success",
          summary: data.summary,
          extractedText: data.extractedText,
          quiz: data.quiz,
          mindmap: data.mindmap
        });
        onSelectActiveFile(file.id);

        setTimeout(() => {
          setFileProgress(prev => {
            const next = { ...prev };
            delete next[file.id];
            return next;
          });
        }, 3000);
      } else {
        throw new Error(data.error || "Phân tích file thất bại");
      }
    } catch (e: any) {
      clearInterval(progressInterval);
      console.error(e);
      setFileProgress(prev => {
        const next = { ...prev };
        delete next[file.id];
        return next;
      });
      onUpdateFile(file.id, {
        status: "error",
        errorMsg: e.message || "Không thể kết nối dịch vụ AI. Hãy kiểm tra API Key."
      });
    }
  };

  // Convert presets to working active file instances
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
      status: "success"
    };

    onAddFile(workingFile);
    onSelectActiveFile(workingFile.id);
  };

  // Badge + accent màu theo trạng thái xử lý của file
  const getStatusMeta = (status: UploadedFile["status"]) => {
    switch (status) {
      case "success":
        return { label: "Sẵn sàng", accent: "var(--color-success)", badge: "text-emerald-700 bg-emerald-50 border-emerald-200/70", pulse: false };
      case "processing":
        return { label: "Đang xử lý", accent: "var(--color-primary)", badge: "text-[var(--color-primary-hover)] bg-indigo-50 border-indigo-200/70", pulse: true };
      case "error":
        return { label: "Lỗi nạp", accent: "var(--color-error)", badge: "text-red-700 bg-red-50 border-red-200/70", pulse: false };
      default:
        return { label: "Hàng đợi", accent: "var(--color-warning)", badge: "text-amber-700 bg-amber-50 border-amber-200/70", pulse: true };
    }
  };

  // Get file icons matching mimeType
  const getFileIcon = (mime: string) => {
    if (mime.includes("pdf")) return <FileText className="text-red-500" size={18} />;
    if (mime.includes("image")) return <Image className="text-blue-500" size={18} />;
    if (mime.includes("audio") || mime.includes("mp3")) return <Music className="text-emerald-500" size={18} />;
    if (mime.includes("video") || mime.includes("mp4")) return <Film className="text-purple-500" size={18} />;
    return <FileText className="text-[var(--color-text-secondary)]" size={18} />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="upload-workspace-section">

      {/* Upload Panel */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        <Card className="p-6 md:p-8 flex flex-col gap-6">
          <div>
            <h3 className="text-[24px] md:text-[28px] font-bold text-[var(--color-text-primary)] leading-tight">Tải Lên File Học Tập</h3>
            <p className="text-[15px] text-[var(--color-text-secondary)] mt-2">Đẩy file giáo trình PDF, Docs, Ảnh bài thu hoạch, hoặc file Nói MP3/MP4 để bắt đầu bóc tách thông tin.</p>
          </div>

          {/* Segmented Control — pill trượt mượt giữa 2 chế độ */}
          <div className="flex bg-[var(--color-neutral-soft)] p-1 rounded-[8px] border border-[var(--color-border-subtle)] mb-2">
            {([
              { id: "file" as const, icon: Upload, label: "Tệp cục bộ" },
              { id: "link" as const, icon: Link, label: "Nhập Link / URL" },
            ]).map((tab) => {
              const Icon = tab.icon;
              const active = uploadTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setUploadTab(tab.id)}
                  className={`relative flex-1 py-1.5 px-3 text-[13px] font-medium rounded-[6px] transition-colors flex items-center justify-center gap-1.5 ${
                    active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="upload-seg-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-0 bg-[var(--color-surface)] rounded-[6px] shadow-sm border border-[var(--color-border-subtle)]"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon size={13} />
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {uploadTab === "file" ? (
            /* Drag & Drop Canvas Wrapper */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group relative border-2 border-dashed rounded-[12px] p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[150px] overflow-hidden ${
                isDragging
                  ? "border-[var(--color-primary)] glass-tint dropzone-active"
                  : "border-[var(--color-border-subtle)] hover:border-[var(--color-primary)] hover:glass-tint"
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
                className={`w-11 h-11 rounded-full bg-indigo-50 text-[var(--color-primary)] flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110 ${
                  isDragging ? "animate-bounce-soft" : ""
                }`}
              >
                <Upload size={18} />
              </div>
              <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                {isDragging ? "Thả ra để mình bóc tách nhé! ✨" : "Kéo thả một hoặc nhiều tệp vào đây"}
              </p>
              <p className="text-[13px] text-[var(--color-neutral)] mt-1">Hoặc nhấp chuột để duyệt & chọn nhiều file cùng lúc</p>

              {/* Chip định dạng file được hỗ trợ */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                {[
                  { label: "PDF", Icon: FileText, color: "text-red-500" },
                  { label: "PNG", Icon: Image, color: "text-blue-500" },
                  { label: "MP3", Icon: Music, color: "text-emerald-500" },
                  { label: "MP4", Icon: Film, color: "text-purple-500" },
                ].map(({ label, Icon, color }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-full py-0.5 px-2 text-[var(--color-text-secondary)]"
                  >
                    <Icon size={10} className={color} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            /* Paste URL Web Link Form */
            <form onSubmit={handleImportFromLink} className="flex flex-col gap-3 min-h-[140px] justify-center">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-[var(--color-text-secondary)] flex items-center gap-1">
                  <Globe size={11} className="text-[var(--color-primary)]" />
                  Dán link YouTube hoặc đường dẫn file trực tuyến:
                </label>
                <div className="relative font-sans">
                  <input
                    type="url"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... hoặc .mp3 / .pdf ..."
                    className="w-full text-[14px] py-[10px] px-[14px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-[6px] outline-none focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-focus-ring)] transition text-[var(--color-text-primary)] placeholder:text-[var(--color-neutral)]"
                    required
                  />
                </div>
                <p className="text-[12px] text-[var(--color-neutral)]">
                  <span className="font-semibold text-[var(--color-primary)]">YouTube:</span> tự lấy transcript → dịch Tiếng Việt → tóm tắt → lưu thành note. Cũng hỗ trợ file công khai (.mp3, .pdf, .docx, .png...).
                </p>
              </div>

              {urlError && (
                <p className="text-[12px] font-medium text-[var(--color-error)] flex items-center gap-1.5">
                  ⚠️ {urlError}
                </p>
              )}

              <Button
                type="submit"
                disabled={isFetchingUrl || !fileUrl.trim()}
                className="w-full mt-2"
              >
                {isFetchingUrl ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Đang tải tệp & Quét AI...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Lấy nội dung & Phân tích bằng AI
                  </>
                )}
              </Button>
            </form>
          )}

        {/* ── Preset samples ── */}
        <div className="border-t border-[var(--color-border-subtle)] pt-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-neutral)] mb-3">
            Thử nhanh với dữ liệu mẫu
          </p>
          <div className="flex flex-col gap-2">
            {presets.map((preset) => {
              const exists = files.some((f) => f.id === preset.id);
              const isAudio = preset.mimeType.includes("audio");
              return (
                <button
                  key={preset.id}
                  disabled={exists}
                  onClick={() => activatePreset(preset)}
                  className={`text-left p-3 rounded-[8px] border transition-all flex items-center justify-between gap-2 ${
                    exists
                      ? "bg-[var(--color-neutral-soft)] text-[var(--color-neutral)] border-[var(--color-border-subtle)] cursor-not-allowed"
                      : "bg-indigo-50/60 text-[var(--color-text-primary)] border-indigo-200/60 hover:bg-indigo-50 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isAudio
                      ? <Music size={13} className="text-emerald-500 flex-shrink-0" />
                      : <FileText size={13} className="text-red-400 flex-shrink-0" />}
                    <span className="text-[13px] font-medium truncate">{preset.name}</span>
                  </div>
                  {!exists && (
                    <span className="text-[11px] font-bold bg-indigo-100 text-[var(--color-primary-hover)] px-2 py-0.5 rounded-[4px] uppercase tracking-wide flex-shrink-0">
                      Dùng mẫu
                    </span>
                  )}
                  {exists && (
                    <span className="text-[11px] text-[var(--color-success)] flex items-center gap-1 flex-shrink-0">
                      <CheckCircle2 size={12} /> Đã nạp
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        </Card>
      </div>

      {/* Uploaded Repository Items list and content viewer */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        <Card className="p-6 md:p-8 flex flex-col gap-6 min-h-[400px]">
          <div>
            <h3 className="text-[24px] md:text-[28px] font-bold text-[var(--color-text-primary)] leading-tight">Danh Mục Files Đang Hoạt Động</h3>
            <p className="text-[15px] text-[var(--color-text-secondary)] mt-2">Chọn một file để bóc tách thông tin hoặc xem tóm tắt AI chi tiết phía dưới.</p>
          </div>

          {files.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[var(--color-border-subtle)] rounded-[12px] glass-tint p-8 text-center">
              {/* Bong bóng thoại của linh vật */}
              <div className="relative mb-3">
                <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] shadow-sm rounded-2xl rounded-bl-sm px-4 py-2 text-[13px] font-medium text-[var(--color-text-primary)] max-w-[260px]">
                  Đang đói kiến thức, thả file vào đây để mình bóc tách nhé! 🍽️
                </div>
              </div>

              {/* Mascot AI trôi nhẹ */}
              <div className="animate-mascot-float w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[#a855f7] flex items-center justify-center text-white shadow-[var(--shadow-primary-glow)]">
                <Bot size={32} />
              </div>

              <p className="text-[16px] font-bold text-[var(--color-text-primary)] mt-4">Thư viện đang trống</p>
              <p className="text-[14px] text-[var(--color-neutral)] max-w-[320px] mt-1">Kéo file bài học lên hoặc nhấp <span className="font-semibold text-[var(--color-primary)]">"Dùng mẫu"</span> bên trái để nạp kho tri thức ngay!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {files.map((file) => {
                const isActive = file.id === activeFileId;
                const statusMeta = getStatusMeta(file.status);

                return (
                  <Card
                    key={file.id}
                    style={{ borderLeftWidth: 3, borderLeftColor: statusMeta.accent }}
                    className={`p-3.5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fade-in ${
                      isActive
                        ? "bg-indigo-50 border-[var(--color-primary)] ring-2 ring-indigo-100"
                        : "hover:border-[var(--color-border-default)]"
                    }`}
                  >
                    <div
                      className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                      onClick={() => {
                        if (file.status === "success") {
                          onSelectActiveFile(file.id);
                        }
                      }}
                    >
                      <div className="p-2 bg-[var(--color-neutral-soft)] rounded-[8px] border border-[var(--color-border-subtle)]">
                        {getFileIcon(file.mimeType)}
                      </div>
                      <div className="truncate min-w-0 flex-1">
                        <div className="flex items-center gap-2 pr-3">
                          <p className={`text-[14px] font-medium truncate ${isActive ? "text-[var(--color-primary-hover)]" : "text-[var(--color-text-primary)]"}`}>
                            {file.name}
                          </p>
                          <span
                            className={`shrink-0 text-[10px] font-bold uppercase tracking-wide rounded-full py-0.5 px-2 border ${statusMeta.badge} ${statusMeta.pulse ? "animate-pulse" : ""}`}
                          >
                            {statusMeta.label}
                          </span>
                        </div>

                        {file.status === "processing" && fileProgress[file.id] ? (
                          <div className="mt-2 w-full pr-4">
                            <div className="flex justify-between items-center mb-1 gap-2">
                              <span className="text-[10px] text-[var(--color-primary)] font-medium animate-pulse truncate max-w-[85%]">
                                🔄 {fileProgress[file.id].stage}
                              </span>
                              <span className="text-[10px] text-[var(--color-text-secondary)] font-mono font-bold">
                                {fileProgress[file.id].percent}%
                              </span>
                            </div>
                            <div className="w-full bg-[var(--color-neutral-soft)] h-1.5 rounded-full overflow-hidden relative">
                              <div
                                className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${fileProgress[file.id].percent}%` }}
                              />
                            </div>
                          </div>
                        ) : file.status === "success" && fileProgress[file.id]?.percent === 100 ? (
                          <div className="mt-2 w-full pr-4">
                            <div className="flex justify-between items-center mb-1 gap-2">
                              <span className="text-[10px] text-[var(--color-success)] font-medium flex items-center gap-1">
                                ✅ {fileProgress[file.id].stage}
                              </span>
                              <span className="text-[10px] text-[var(--color-success)] font-mono font-bold">
                                100%
                              </span>
                            </div>
                            <div className="w-full bg-emerald-50 h-1.5 rounded-full overflow-hidden relative">
                              <div
                                className="bg-[var(--color-success)] h-full rounded-full transition-all duration-500"
                                style={{ width: "100%" }}
                              />
                            </div>
                          </div>
                        ) : file.status === "error" ? (
                          <p className="text-[12px] text-[var(--color-error)] mt-0.5 leading-snug line-clamp-2 pr-3">
                            {file.errorMsg || "Tải tài nguyên thất bại."}
                          </p>
                        ) : (
                          <p className="text-[12px] text-[var(--color-neutral)] font-mono mt-0.5">
                            {(file.size / 1024).toFixed(1)} KB • {file.mimeType.split("/")[1]?.toUpperCase() || "UNKNOWN"}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action button representing current file state */}
                    <div className="flex items-center gap-2">
                      {file.status === "idle" && (
                        <Button
                          size="sm"
                          onClick={() => processFileAI(file)}
                          icon={<ArrowRight size={13} />}
                        >
                          Phân Tích File
                        </Button>
                      )}

                      {file.status === "processing" && (
                        <span className="text-[11px] font-medium text-[var(--color-primary)] flex items-center gap-1 bg-indigo-50 py-1.5 px-3 rounded-[12px] animate-pulse">
                          <Loader2 size={12} className="animate-spin" /> Đang định dạng...
                        </span>
                      )}

                      {file.status === "success" && !isActive && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onSelectActiveFile(file.id)}
                        >
                          Kích hoạt
                        </Button>
                      )}

                      {file.status === "success" && isActive && (
                        <span className="text-[11px] font-medium text-[var(--color-success)] bg-emerald-50 border border-emerald-200/60 py-1.5 px-3 rounded-[12px] flex items-center gap-1">
                          <CheckCircle2 size={12} /> ACTIVE
                        </span>
                      )}

                      {file.status === "error" && (
                        <div className="flex items-center gap-1 bg-[var(--color-error-soft)] border border-[var(--color-error)]/30 rounded-[8px] py-1 px-2.5 text-[var(--color-error)] text-[11px] font-medium">
                          <AlertTriangle size={12} /> Lỗi nạp
                          <button onClick={() => retryFile(file)} className="underline hover:opacity-80 font-bold ml-1">Thử lại</button>
                        </div>
                      )}

                      {/* Nút xóa file khỏi kho (xóa luôn trong IndexedDB) */}
                      <button
                        onClick={() => {
                          if (window.confirm(`Xóa "${file.name}" khỏi kho lưu trữ?`)) onDeleteFile(file.id);
                        }}
                        title="Xóa file này"
                        className="p-1.5 rounded-[8px] text-[var(--color-neutral)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-soft)] transition-colors flex-shrink-0"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      </div>

    </div>
  );
}
