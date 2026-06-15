import React, { useState, useRef } from "react";
import { UploadedFile, QuizQuestion, MindMapNode } from "../types";
import { Upload, FileText, Image, Music, Film, CheckCircle2, AlertTriangle, Play, Sparkles, Loader2, ArrowRight, Link, Globe } from "lucide-react";

interface DocUploadSectionProps {
  files: UploadedFile[];
  onAddFile: (file: UploadedFile) => void;
  onUpdateFile: (id: string, updated: Partial<UploadedFile>) => void;
  activeFileId: string | null;
  onSelectActiveFile: (id: string) => void;
}

export default function DocUploadSection({
  files,
  onAddFile,
  onUpdateFile,
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

  // Process files uploads
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFileToWorkspace(droppedFiles[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFileToWorkspace(selectedFiles[0]);
    }
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
    const id = `file_${Date.now()}`;
    const newFile: UploadedFile = {
      id,
      name: rawFile.name,
      size: rawFile.size,
      mimeType: rawFile.type || "application/octet-stream",
      status: "idle"
    };

    // Convert file to base64 to send to back-end
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(",")[1];
      newFile.base64Data = base64String;
      onAddFile(newFile);
      // Immediately start processing to make it highly automated!
      processFileAI(newFile);
    };
    reader.readAsDataURL(rawFile);
  };

  const handleImportFromLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUrl || !fileUrl.trim().startsWith("http")) {
      setUrlError("Vui lòng nhập đường dẫn liên kết URL hợp lệ bắt đầu bằng http:// hoặc https://");
      return;
    }

    setUrlError(null);
    setIsFetchingUrl(true);
    
    const tempId = `link_${Date.now()}`;
    const newFile: UploadedFile = {
      id: tempId,
      name: "Đang tải tệp trực tuyến...",
      size: 0,
      mimeType: "application/pdf",
      status: "processing"
    };

    onAddFile(newFile);

    // Start progress tracking for this link file!
    setFileProgress(prev => ({
      ...prev,
      [tempId]: { percent: 10, stage: "Đang bắt đầu liên kết nguồn tải dữ liệu..." }
    }));

    let currentPercent = 10;
    const progressInterval = setInterval(() => {
      currentPercent += Math.floor(Math.random() * 6) + 2;
      if (currentPercent > 92) {
        currentPercent = 92;
      }
      setFileProgress(prev => ({
        ...prev,
        [tempId]: { 
          percent: currentPercent, 
          stage: getStageMessage(currentPercent, "application/pdf", "file_tu_link.pdf")
        }
      }));
    }, 700);

    try {
      const res = await fetch("/api/process-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fileUrl })
      });

      const data = await res.json();
      clearInterval(progressInterval);

      if (data.success) {
        setFileProgress(prev => ({
          ...prev,
          [tempId]: { percent: 100, stage: "Hoàn tất xử lý tài nguyên liên kết!" }
        }));

        onUpdateFile(tempId, {
          name: data.name,
          size: data.size || 51200,
          mimeType: data.mimeType || "application/pdf",
          status: "success",
          summary: data.summary,
          extractedText: data.extractedText,
          quiz: data.quiz,
          mindmap: data.mindmap
        });

        onSelectActiveFile(tempId);
        setFileUrl("");

        setTimeout(() => {
          setFileProgress(prev => {
            const next = { ...prev };
            delete next[tempId];
            return next;
          });
        }, 3000);
      } else {
        throw new Error(data.error || "Không thể tải hoặc phân tích liên kết.");
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error(err);
      onUpdateFile(tempId, {
        name: "Lỗi liên kết URL",
        status: "error",
        errorMsg: err.message || "Tải tài nguyên thất bại. Hãy thử tệp khác hoặc đính kèm trực tiếp."
      });
      setFileProgress(prev => {
        const next = { ...prev };
        delete next[tempId];
        return next;
      });
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Call the server to process file with AI
  const processFileAI = async (file: UploadedFile) => {
    if (!file.base64Data) return;

    onUpdateFile(file.id, { status: "processing", errorMsg: undefined });

    // Start progress tracking
    setFileProgress(prev => ({
      ...prev,
      [file.id]: { percent: 5, stage: "Đang nạp file vào bộ nhớ đệm..." }
    }));

    let currentPercent = 5;
    const progressInterval = setInterval(() => {
      currentPercent += Math.floor(Math.random() * 8) + 3; // increments by 3 to 10
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
      const res = await fetch("/api/process-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          mimeType: file.mimeType,
          base64Data: file.base64Data
        })
      });

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
        // Set active immediately
        onSelectActiveFile(file.id);

        // Gracefully remove progress bar after 3 seconds so clean metrics display
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

  // Get file icons matching mimeType
  const getFileIcon = (mime: string) => {
    if (mime.includes("pdf")) return <FileText className="text-red-500" size={18} />;
    if (mime.includes("image")) return <Image className="text-blue-500" size={18} />;
    if (mime.includes("audio") || mime.includes("mp3")) return <Music className="text-emerald-500" size={18} />;
    if (mime.includes("video") || mime.includes("mp4")) return <Film className="text-purple-500" size={18} />;
    return <FileText className="text-slate-500" size={18} />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="upload-workspace-section">
      
      {/* Upload Panel */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Tải Lên File Học Tập</h3>
            <p className="text-xs text-slate-500 mt-1">Đẩy file giáo trình PDF, Docs, Ảnh bài thu hoạch, hoặc file Nói MP3/MP4 để bắt đầu bóc tách thông tin.</p>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 mb-2">
            <button
              onClick={() => setUploadTab("file")}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                uploadTab === "file"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Upload size={13} />
              Tệp cục bộ
            </button>
            <button
              onClick={() => setUploadTab("link")}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                uploadTab === "link"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Link size={13} />
              Nhập Link / URL
            </button>
          </div>

          {uploadTab === "file" ? (
            /* Drag & Drop Canvas Wrapper */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[140px] ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50/50"
                  : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.mp3,.mp4,.wav"
              />
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5">
                <Upload size={18} />
              </div>
              <p className="text-xs font-semibold text-slate-700">Kéo thả tệp tin vào đây</p>
              <p className="text-[10px] text-slate-400 mt-1">Hoặc nhấp chuột để duyệt file cục bộ từ máy tính</p>
            </div>
          ) : (
            /* Paste URL Web Link Form */
            <form onSubmit={handleImportFromLink} className="flex flex-col gap-3 min-h-[140px] justify-center">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Globe size={11} className="text-indigo-500" />
                  Đường dẫn liên kết trực tuyến (Audio / File):
                </label>
                <div className="relative font-sans">
                  <input
                    type="url"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://example.com/bai-thi-tieng-anh.mp3 hoặc .pdf ..."
                    className="w-full text-xs p-2.5 pr-8 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Hỗ trợ tải tệp trực tuyến công khai (.mp3, .wav, .pdf, .docx, .png, .jpg...) để lọc dịch và học tập bằng AI.
                </p>
              </div>

              {urlError && (
                <p className="text-[10px] font-medium text-rose-600 flex items-center gap-1.5">
                  ⚠️ {urlError}
                </p>
              )}

              <button
                type="submit"
                disabled={isFetchingUrl || !fileUrl.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isFetchingUrl ? (
                  <>
                    <Loader2 className="animate-spin" size={13} />
                    Đang tải tệp & Quét AI...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    Tải Link & Phân Tích OCR / AI 🚀
                  </>
                )}
              </button>
            </form>
          )}

          {/* Presets Trigger items */}
          <div className="border-t border-slate-100 pt-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2.5">
              HỌC TẬP THỬ NGHIỆM NHANH (Presets)
            </span>
            <div className="flex flex-col gap-2">
              {presets.map((preset) => {
                const alreadyExists = files.some((f) => f.id === preset.id);

                return (
                  <button
                    key={preset.id}
                    disabled={alreadyExists}
                    onClick={() => activatePreset(preset)}
                    className={`text-left text-xs p-3 rounded-xl border border-dotted flex items-center justify-between transition-all ${
                      alreadyExists
                        ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "bg-indigo-50/20 text-indigo-950 border-indigo-200/60 hover:bg-indigo-50/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Sparkles size={13} className="text-indigo-500 flex-shrink-0" />
                      <span className="truncate font-medium">{preset.name}</span>
                    </div>
                    {!alreadyExists && <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0">Dùng mẫu</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Uploaded Repository Items list and content viewer */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col gap-4 min-h-[400px]">
          <div>
            <h3 className="text-base font-bold text-slate-800">Danh Mục Files Đang Hoạt Động</h3>
            <p className="text-xs text-slate-500 mt-1">Chọn một file để bóc tách thông tin hoặc xem tóm tắt AI chi tiết phía dưới.</p>
          </div>

          {files.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border border-slate-100 rounded-2xl bg-slate-50/50 p-8 text-center">
              <FileText size={32} className="text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Thư viện file trống</p>
              <p className="text-[10px] text-slate-450 max-w-[240px] mt-1">Hãy kéo file bài học của bạn lên hoặc nhấp "Dùng mẫu" ở bên trái để nạp kho tri thức ngay lập tức!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {files.map((file) => {
                const isActive = file.id === activeFileId;

                return (
                  <div
                    key={file.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isActive ? "bg-slate-50 border-indigo-400 ring-1 ring-indigo-400" : "bg-white border-slate-150 hover:border-slate-300"
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
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                        {getFileIcon(file.mimeType)}
                      </div>
                      <div className="truncate min-w-0 flex-1">
                        <p className={`text-xs font-bold truncate pr-3 ${isActive ? "text-indigo-700" : "text-slate-800"}`}>
                          {file.name}
                        </p>
                        
                        {file.status === "processing" && fileProgress[file.id] ? (
                          <div className="mt-2 w-full pr-4">
                            <div className="flex justify-between items-center mb-1 gap-2">
                              <span className="text-[10px] text-indigo-600 font-semibold animate-pulse truncate max-w-[85%]">
                                🔄 {fileProgress[file.id].stage}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono font-bold">
                                {fileProgress[file.id].percent}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-indigo-700 h-full rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${fileProgress[file.id].percent}%` }}
                              />
                            </div>
                          </div>
                        ) : file.status === "success" && fileProgress[file.id]?.percent === 100 ? (
                          <div className="mt-2 w-full pr-4">
                            <div className="flex justify-between items-center mb-1 gap-2">
                              <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                                ✅ {fileProgress[file.id].stage}
                              </span>
                              <span className="text-[10px] text-green-600 font-mono font-bold">
                                100%
                              </span>
                            </div>
                            <div className="w-full bg-green-50 h-2 rounded-full overflow-hidden relative border border-green-150">
                              <div
                                className="bg-green-600 h-full rounded-full transition-all duration-500"
                                style={{ width: "100%" }}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {(file.size / 1024).toFixed(1)} KB • {file.mimeType.split("/")[1]?.toUpperCase() || "UNKNOWN"}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action button representing current file state */}
                    <div className="flex items-center gap-2">
                      {file.status === "idle" && (
                        <button
                          onClick={() => processFileAI(file)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] py-1.5 px-3 rounded-xl transition flex items-center gap-1.5"
                        >
                          Phân Tích File <ArrowRight size={13} />
                        </button>
                      )}

                      {file.status === "processing" && (
                        <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 py-1.5 px-3 rounded-xl animate-pulse">
                          <Loader2 size={13} className="animate-spin" /> Đang định dạng...
                        </span>
                      )}

                      {file.status === "success" && !isActive && (
                        <button
                          onClick={() => onSelectActiveFile(file.id)}
                          className="text-slate-600 hover:text-indigo-600 font-semibold text-[11px] py-1.5 px-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                        >
                          Kích hoạt
                        </button>
                      )}

                      {file.status === "success" && isActive && (
                        <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200/60 py-1.5 px-3 rounded-xl flex items-center gap-1">
                          <CheckCircle2 size={13} /> ACTIVE KNOWLEDGE
                        </span>
                      )}

                      {file.status === "error" && (
                        <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-xl py-1 px-2.5 text-rose-700 text-[10px] font-semibold">
                          <AlertTriangle size={12} /> Lỗi nạp
                          <button onClick={() => processFileAI(file)} className="underline hover:text-rose-950 font-bold ml-1">Thử lại</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
