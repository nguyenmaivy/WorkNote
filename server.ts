import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import multer from "multer";
import { rateLimit } from "express-rate-limit";

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Cấu hình Rate Limiters bảo vệ server
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 150, // Tối đa 150 request / phút từ mỗi IP cho các API thông thường
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút." }
});

const heavyAiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 10, // Tối đa 10 request / 5 phút từ mỗi IP cho các thao tác nặng liên quan tới AI
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Bạn đã gửi quá nhiều yêu cầu phân tích tài liệu/giọng nói. Vui lòng thử lại sau 5 phút." }
});

// Áp dụng Rate Limiters cho các API tương ứng
app.use("/api/", apiLimiter);
app.use("/api/process-file", heavyAiLimiter);
app.use("/api/process-link", heavyAiLimiter);
app.use("/api/translate-live-audio", heavyAiLimiter);

// 2. Class Concurrency Limiter để kiểm soát số lượng cuộc gọi Gemini API đồng thời
class ConcurrencyLimiter {
  private activeCount = 0;
  private queue: (() => void)[] = [];
  constructor(private limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}
const geminiLimiter = new ConcurrencyLimiter(3); // Tối đa 3 cuộc gọi đồng thời sang Gemini

// 3. Cấu hình Multer lưu tạm file tải lên vào đĩa cứng (Disk Storage) tránh nghẽn RAM
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // Giới hạn kích thước file tải lên là 20MB
  }
});

// Set body parser limits for handling larger file uploads of PDFs, docs, audios or images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize GoogleGenAI SDK with user secrets
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ Warning: GEMINI_API_KEY is not defined. AI features will require you to set it up in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Robust helper to sanitize MIME type and prepare safe Gemini content payloads (multimodal vs decoded text inputs)
function getSafeGeminiPayload(name: string, originalMime: string, base64Data: string, buffer: Buffer) {
  let cleanMime = (originalMime || "application/octet-stream").split(";")[0].trim().toLowerCase();
  const ext = (name.split(".").pop() || "").toLowerCase();

  // Extend ext mappings
  if (ext === "pdf") cleanMime = "application/pdf";
  else if (["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) {
    if (ext === "jpg" || ext === "jpeg") cleanMime = "image/jpeg";
    else cleanMime = `image/${ext}`;
  } else if (["mp3", "wav", "m4a", "ogg", "flac"].includes(ext)) {
    if (ext === "mp3") cleanMime = "audio/mp3";
    else cleanMime = `audio/${ext}`;
  } else if (["mp4", "webm", "avi", "mov"].includes(ext)) {
    if (ext === "mp4") cleanMime = "video/mp4";
    else cleanMime = `video/${ext}`;
  } else if (["html", "htm", "txt", "md", "json", "csv", "xml"].includes(ext)) {
    if (ext === "html" || ext === "htm") cleanMime = "text/html";
    else if (ext === "csv") cleanMime = "text/csv";
    else cleanMime = "text/plain";
  }

  const isPdf = cleanMime === "application/pdf";
  const isImage = cleanMime.startsWith("image/");
  const isAudio = cleanMime.startsWith("audio/");
  const isVideo = cleanMime.startsWith("video/");

  if (isPdf || isImage || isAudio || isVideo) {
    return {
      type: "multimodal",
      filePart: {
        inlineData: {
          mimeType: cleanMime,
          data: base64Data,
        }
      }
    };
  } else {
    // Treat as safe UTF-8 decoded text input (HTML, txt, csv, json, md, etc.) to completely avoid 400 Unsupported MIME type crashes
    let textContent = "";
    try {
      textContent = buffer.toString("utf-8");
      if (cleanMime === "text/html" || textContent.includes("<html") || textContent.includes("<body")) {
        // Simple HTML stripping of script, style, and HTML elements
        textContent = textContent
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    } catch {
      textContent = `[Nội dung tệp ${name} không giải mã được dạng văn bản]`;
    }
    return {
      type: "text",
      textContent: textContent || `[Nội dung tệp trống]`
    };
  }
}

// 1. API: Process File (PDF, Docs, Audio MP3/WAV, Image, Video MP4)
app.post("/api/process-file", upload.single("file"), async (req, res): Promise<any> => {
  let tempFilePath: string | null = null;
  try {
    let name: string;
    let mimeType: string;
    let base64Data: string;
    let buffer: Buffer;

    if (req.file) {
      tempFilePath = req.file.path;
      name = req.body.name || req.file.originalname;
      mimeType = req.body.mimeType || req.file.mimetype;
      buffer = await fs.promises.readFile(tempFilePath);
      base64Data = buffer.toString("base64");
    } else {
      const { name: bodyName, mimeType: bodyMime, base64Data: bodyBase64 } = req.body;
      if (!bodyBase64) {
        return res.status(400).json({ error: "Missing file payload (multipart or base64)" });
      }
      name = bodyName;
      mimeType = bodyMime;
      base64Data = bodyBase64;
      buffer = Buffer.from(base64Data, "base64");
    }

    const ai = getAiClient();
    if (!process.env.GEMINI_API_KEY) {
      // Return a simulated high-quality education response with structured mock content if key is missing
      return res.json({
        success: true,
        isDemo: true,
        summary: `### Tóm tắt tài liệu: ${name}\n\nĐây là chế độ Demo (Chưa cấu hình GEMINI_API_KEY trong Secrets).\nTài liệu của bạn chứa thông tin học tập quan trọng. Sau khi cấu hình API Key, AI sẽ đọc chính xác từng dòng và chuyển thể thành các định dạng tương tác dưới đây.`,
        extractedText: `Văn bản mẫu được giả lập cho tài liệu ${name}. Xin hãy cấu hình API Key của bạn trong Secrets để sử dụng sức mạnh xử lý thực tế cực chất từ của gemini-3.5-flash!`,
        quiz: [
          {
            id: "q1",
            question: "Làm thế nào để chuyển đổi Web App thông thường sang ứng dụng Mobile và ngược lại?",
            options: [
              "Chỉ có thể viết lại toàn bộ từ đầu bằng ngôn ngữ khác",
              "Sử dụng các Hybrid Framework như React Native, Expo, Flutter hoặc Capacitor/Cordova để chia sẻ mã nguồn",
              "Dùng trình duyệt Safari trên điện thoại để mở thủ công mỗi lần dùng",
              "Cài đặt trực tiếp file .exe lên điện thoại Android"
            ],
            correctAnswer: "Sử dụng các Hybrid Framework như React Native, Expo, Flutter hoặc Capacitor/Cordova để chia sẻ mã nguồn",
            explanation: "Các Hybrid Framework cho phép biên dịch chung một cơ sở mã nguồn (JS/TS) ra cả nền tảng Android, iOS và Web, giúp tối ưu hóa chi phí và nhân lực."
          },
          {
            id: "q2",
            question: "Phương pháp nào cho phép quét mã QR để người dùng di động và web có thể mở dùng ứng dụng ngay lập tức?",
            options: [
              "Sử dụng deep linking kết hợp với công nghệ Web App dự phòng (Universal Links / App Links)",
              "Cung cấp 2 mã QR khác nhau hoàn toàn cho người dùng chọn lựa",
              "Mã QR chỉ chứa số điện thoại tổng đài",
              "Yêu cầu người dùng phải gõ thủ công đường dẫn IP cục bộ"
            ],
            correctAnswer: "Sử dụng deep linking kết hợp với công nghệ Web App dự phòng (Universal Links / App Links)",
            explanation: "Một mã QR chứa liên kết HTTPS duy nhất. Khi người dùng quét, nếu điện thoại đã cài app thì kích hoạt deep link mở app, nếu chưa cài thì mở trình duyệt hiển thị Web App ngay lập tức."
          }
        ],
        mindmap: {
          id: "root",
          label: name,
          children: [
            {
              id: "node_1",
              label: "1. Kiến Trúc Đa Nền Tảng",
              children: [
                { id: "node_1_1", label: "Frontend: React / React Native" },
                { id: "node_1_2", label: "Backend: Express / Node.js" },
                { id: "node_1_3", label: "Database: PostgreSQL / Cloud SQL" }
              ]
            },
            {
              id: "node_2",
              label: "2. Quy trình NotebookLM",
              children: [
                { id: "node_2_1", label: "OCR: Trích xuất hình ảnh, PDF" },
                { id: "node_2_2", label: "Semantic Search: Tìm kiếm ngữ nghĩa" },
                { id: "node_2_3", label: "LLM: Trả lời theo tài liệu gốc" }
              ]
            }
          ]
        }
      });
    }

    // Call Gemini to analyze the file safely (handling text files / scraped web pages as pure prompts)
    const payload = getSafeGeminiPayload(name, mimeType || "application/octet-stream", base64Data, buffer);

    let contentsPayload: any[] = [];
    let promptMessage = `Hãy phân tích nội dung tệp tin "${name}" dưới đây.
Dựa vào nội dung đó, hãy trích xuất và cung cấp thông tin theo cấu trúc JSON nghiêm ngặt có định dạng:
{
  "summary": "Tóm tắt chi tiết nội dung học tập bằng markdown Tiếng Việt rất sinh động và thực tế",
  "extractedText": "Văn bản thô đầy đủ được trích xuất từ tệp",
  "quiz": [
    {
      "id": "q1",
      "question": "Câu hỏi ôn tập trắc nghiệm số 1 thấu đáo?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Giải thích chi tiết tại sao đúng"
    }
  ],
  "mindmap": {
    "id": "root",
    "label": "Tên chủ đề chính của tệp",
    "children": [
      {
        "id": "child1",
        "label": "Tên nhánh chính 1 (Ví dụ: I. Khái niệm, II. Ứng dụng...)",
        "children": [
          { "id": "child1_1", "label": "Nhánh phụ chi tiết 1.1" }
        ]
      }
    ]
  }
}
Lưu ý: Hãy tự động phân tích định dạng cấu trúc cây (I, II, III, A, B, 1, 2) có trong nội dung để tạo ra cây sơ đồ tư duy (mindmap) chính xác nhất. Không trả về bất cứ văn bản nào ngoài JSON hợp lệ.`;

    if (payload.type === "multimodal") {
      contentsPayload = [payload.filePart, promptMessage];
    } else {
      promptMessage += `\n\nNội dung văn bản bóc tách thu được từ tài liệu:\n${payload.textContent}`;
      contentsPayload = [promptMessage];
    }

    const parsedData = await geminiLimiter.run(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contentsPayload,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              extractedText: { type: Type.STRING },
              quiz: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    correctAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["id", "question", "options", "correctAnswer", "explanation"]
                }
              },
              mindmap: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  children: {
                    type: Type.ARRAY,
                    items: { type: Type.OBJECT } // Recursive JSON structure setup
                  }
                },
                required: ["id", "label"]
              }
            },
            required: ["summary", "extractedText", "quiz", "mindmap"]
          }
        }
      });
      return JSON.parse(response.text || "{}");
    });

    return res.json({ success: true, ...parsedData });

  } catch (error: any) {
    console.error("Error in /api/process-file:", error);
    res.status(500).json({ error: error.message || "Failed to process file" });
  } finally {
    if (tempFilePath) {
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (err) {
        console.warn("Failed to delete temp file:", tempFilePath, err);
      }
    }
  }
});

// 1.5. API: Fetch and process file from a Web URL link
app.post("/api/process-link", async (req, res): Promise<any> => {
  try {
    const { url } = req.body;
    if (!url || !url.startsWith("http")) {
      return res.status(400).json({ error: "Tham số URL không hợp lệ hoặc không bắt đầu bằng http/https" });
    }

    // Smart auto-conversion for public cloud-hosted links 
    let finalUrl = url;
    if (url.includes("drive.google.com")) {
      const matchFileId = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/) || url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
      if (matchFileId && matchFileId[1]) {
        finalUrl = `https://drive.google.com/uc?export=download&id=${matchFileId[1]}`;
        console.log(`Auto-resolved Google Drive sharing link to direct download: ${finalUrl}`);
      }
    } else if (url.includes("dropbox.com")) {
      finalUrl = url.replace("dl=0", "dl=1").replace("www.dropbox.com", "dl.dropboxusercontent.com");
      console.log(`Auto-resolved Dropbox sharing link to direct download: ${finalUrl}`);
    }

    // Extract filename from URL or assign fallback
    let name = "tai_lieu_tu_link";
    try {
      const parsedUrl = new URL(finalUrl);
      const pathname = parsedUrl.pathname;
      const lastSegment = pathname.substring(pathname.lastIndexOf("/") + 1);
      if (lastSegment && lastSegment.includes(".")) {
        name = decodeURIComponent(lastSegment);
      } else {
        name = parsedUrl.hostname + "_doc";
      }
    } catch (_) {
      name = "file_tu_u_r_l";
    }

    console.log(`Downloading URL contents for processing: ${finalUrl}`);
    
    let resFetch;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    try {
      resFetch = await fetch(finalUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "*/*"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!resFetch.ok) {
        throw new Error(`Tải file thất bại với mã lỗi HTTP: ${resFetch.status}`);
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      return res.status(400).json({ error: `Không thể kết nối hoặc tải tệp từ liên kết này. Lỗi: ${fetchErr.name === 'AbortError' ? 'Yêu cầu tải tệp quá thời gian cho phép (Timeout 15s)' : fetchErr.message}` });
    }

    // Kiểm tra Header Content-Length để chặn file quá lớn trước khi tải
    const contentLengthHeader = resFetch.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (contentLength > 20 * 1024 * 1024) { // 20MB
        return res.status(400).json({ error: "Tệp tin liên kết quá lớn (tối đa 20MB)." });
      }
    }

    const mimeType = resFetch.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await resFetch.arrayBuffer();
    
    // Kiểm tra dung lượng tải thực tế
    if (arrayBuffer.byteLength > 20 * 1024 * 1024) {
      return res.status(400).json({ error: "Tệp tin tải về vượt quá giới hạn 20MB." });
    }
    
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const fileSize = buffer.length;

    console.log(`Successfully downloaded file: ${name} (${fileSize} bytes, Mime: ${mimeType})`);

    const ai = getAiClient();
    if (!process.env.GEMINI_API_KEY) {
      // Simulate processed link output
      return res.json({
        success: true,
        isDemo: true,
        name,
        mimeType,
        size: fileSize,
        summary: `### Phân tích từ liên kết: ${name}\n\nLiên kết nguồn: [${url}](${url})\nTải tệp thành công (${(fileSize / 1024).toFixed(1)} KB).\n\nĐây là chế độ Demo (khi chưa cấu hình API Key). Hệ thống đã lập chỉ mục và phân tích sẵn sàng nội dung tài liệu. Cấu hình chìa khóa học tập của bạn để cho phép AI thâm nhập sâu hơn!`,
        extractedText: `Văn bản ghi nhận từ URL nguồn: ${url}. Đang kích hoạt kiểm định ngữ nghĩa và lập bản đồ tư duy tự động dưới dạng sơ đồ hình cây chi tiết.`,
        quiz: [
          {
            id: "q_link_1",
            question: "Đâu là điểm mấu chốt khi liên kết dữ liệu học tập thông qua đường dẫn liên kết URL công khai?",
            options: [
              "Giúp lưu trữ tài liệu trực tuyến, truy cập đồng bộ không tốn tài nguyên ổ cứng cá nhân",
              "Bắt buộc người học phải in tài liệu ra giấy",
              "URL chỉ hoạt động được trên máy tính cây để bàn",
              "Không thể bảo mật thông tin với bất kỳ dạng liên kết nào"
            ],
            correctAnswer: "Giúp lưu trữ tài liệu trực tuyến, truy cập đồng bộ không tốn tài nguyên ổ cứng cá nhân",
            explanation: "Một liên kết trực tuyến cho phép đồng bộ hóa dữ liệu học lập tức, không tốn không gian bộ nhớ máy cục bộ, và dễ dàng bóc tách qua AI trung chuyển."
          }
        ],
        mindmap: {
          id: "root",
          label: name,
          children: [
            {
              id: "nl_1",
              label: "1. Nguồn Gốc Liên Kết Web",
              children: [
                { id: "nl_1_1", label: `URL: ${url}` },
                { id: "nl_1_2", label: `Kích thước: ${(fileSize / 1024).toFixed(1)} KB` }
              ]
            },
            {
              id: "nl_2",
              label: "2. Chế Độ Vận Hành",
              children: [
                { id: "nl_2_1", label: "Tính năng: Dịch thuật trực tiếp" },
                { id: "nl_2_2", label: "Tóm tắt & Hoạt hình bản đồ" }
              ]
            }
          ]
        }
      });
    }

    // Process with robust Gemini validation (mapping multimodal vs decoded raw HTML text)
    const payload = getSafeGeminiPayload(name, mimeType || "application/octet-stream", base64Data, buffer);

    let contentsPayload: any[] = [];
    let promptMessage = `Hãy phân tích nội dung tệp tin "${name}" thu nhận từ liên kết nguồn trực tuyến này.
Dựa vào nội dung đó, hãy trích xuất và cung cấp thông tin theo cấu trúc JSON nghiêm ngặt có định dạng:
{
  "summary": "Tóm tắt chi tiết nội dung học tập bằng markdown Tiếng Việt cực kỳ dễ hiểu",
  "extractedText": "Toàn bộ văn bản thô được trích xuất từ tệp",
  "quiz": [
    {
      "id": "ql1",
      "question": "Câu hỏi rèn luyện bám sát nội dung?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Lời giải chi tiết thấu tình đạt lý"
    }
  ],
  "mindmap": {
    "id": "root",
    "label": "Tên bài học chính",
    "children": [
      {
        "id": "c1",
        "label": "Nhánh chính lý thuyết",
        "children": [
          { "id": "c1_1", "label": "Ý phụ lý thuyết" }
        ]
      }
    ]
  }
}
Lưu ý: Hãy sinh JSON hoàn hảo không chứa văn bản bao quanh.`;

    if (payload.type === "multimodal") {
      contentsPayload = [payload.filePart, promptMessage];
    } else {
      promptMessage += `\n\nNội dung văn bản tài liệu thu được từ liên kết:\n${payload.textContent}`;
      contentsPayload = [promptMessage];
    }

    const parsedData = await geminiLimiter.run(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contentsPayload,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              extractedText: { type: Type.STRING },
              quiz: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    correctAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["id", "question", "options", "correctAnswer", "explanation"]
                }
              },
              mindmap: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  children: {
                    type: Type.ARRAY,
                    items: { type: Type.OBJECT }
                  }
                },
                required: ["id", "label"]
              }
            },
            required: ["summary", "extractedText", "quiz", "mindmap"]
          }
        }
      });
      return JSON.parse(response.text || "{}");
    });

    return res.json({
      success: true,
      name,
      mimeType,
      size: fileSize,
      ...parsedData
    });

  } catch (error: any) {
    console.error("Error in /api/process-link:", error);
    res.status(500).json({ error: error.message || "Failed to process target link" });
  }
});

// 2. API: Document Chatbot Query
app.post("/api/chat", async (req, res): Promise<any> => {
  try {
    const { messages, contextFileText, voiceSettings } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    if (messages.length === 0) {
      return res.json({
        success: true,
        isDemo: !process.env.GEMINI_API_KEY
      });
    }

    const ai = getAiClient();
    const systemPromptMessage = `Bạn là VietLearn AI - Trợ lý thông thái thấu hiểu tài liệu của người dùng.
Nội dung tài liệu kèm theo đang hoạt động là:
"""
${contextFileText || "Không có tệp tài liệu nào được kích hoạt. Bạn sẽ trả lời các thắc mắc chung về học tập, lập trình, hoặc các câu hỏi trong thiết kế hệ thống."}
"""

HƯỚNG DẪN TRẢ LỜI:
1. Hãy dựa vào tài liệu cung cấp để đưa ra phản hồi chính xác, ngắn gọn và mạch lạc bằng Tiếng Việt.
2. Nếu người dùng chat không có prompt sẵn hoặc chat tự do không dấu, hãy linh hoạt tự nhận diện ý định và hướng họ tới câu trả lời đúng/gần đúng nhất.
3. Khi giải thích các vấn đề ngôn ngữ / vùng miền (giọng Bắc, Trung, Nam), hãy kèm theo phân tích ngữ âm hoặc lưu ý phát âm phù hợp theo giọng từng miền để hỗ trợ tối đa cho học viên.
4. Trả lời một cách khiêm tốn, lịch sự và khoa học.`;

    if (!process.env.GEMINI_API_KEY) {
      const lastUserMsg = messages[messages.length - 1]?.content || "";
      let mockReply = `Chào bạn! (Chế độ Demo - Chưa cấu hình API Key trong Secrets)

Bạn vừa hỏi: "${lastUserMsg}". 
Để trợ lý hoạt động thực tế với mô hình gemini-3.5-flash siêu tốc, vui lòng bấm vào nút Secrets trên thanh công cụ và nhập GEMINI_API_KEY nhé! 

Dưới đây là gợi ý trả lời dựa trên kho tri thức:
- Nếu bạn hỏi về ngữ âm Bắc-Trung-Nam: Tiếng Việt có sự phong phú lớn về thanh điệu (giọng Bắc sắc sảo phân biệt hỏi/ngã, giọng Nam mượt mà đồng nhất hỏi/ngã, giọng Trung trầm ấm, thanh điệu đặc trưng).
- Để AI không ngột ngạt với prompt: Hãy huấn luyện chatbot bằng cấu hình phân nhóm ngữ nghĩa (semantic slots) và từ điển đồng nghĩa (synonyms) để quy nạp các câu nói 'chat tự do' về đúng hành vi mong muốn.`;
      
      return res.json({
        success: true,
        reply: mockReply
      });
    }

    // Convert messages array into content structure for Gemini API
    const contentsPayload = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contentsPayload,
      config: {
        systemInstruction: systemPromptMessage,
        temperature: 0.7,
      }
    });

    return res.json({
      success: true,
      reply: response.text || "Xin lỗi, tôi chưa thể đưa ra câu trả lời."
    });

  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "Failed to conduct chat session" });
  }
});

// 3. API: Play regional accent TTS or convert Text to Audiostream
app.post("/api/tts", async (req, res): Promise<any> => {
  try {
    const { text, region } = req.body; // region is 'north' | 'central' | 'south'
    if (!text) {
      return res.status(400).json({ error: "Text is required for Speech Synthesis" });
    }

    const ai = getAiClient();
    
    // Choose voice based on request representation
    let voiceName = "Kore"; // default cheerful
    if (region === "central") {
      voiceName = "Fenrir"; // deep/solid
    } else if (region === "south") {
      voiceName = "Zephyr"; // smooth/breezy
    } else if (region === "north") {
      voiceName = "Kore"; // crisp/sharp
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        success: true,
        isDemo: true,
        region,
        message: "Demo Accent Synthesis setup completed (Requires GEMINI_API_KEY for real audio stream generation)."
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Đọc văn bản sau bằng giọng tương tự phong thái tiếng Việt miền ${region === "north" ? "Bắc" : region === "central" ? "Trung" : "Nam"}, diễn cảm tự nhiên: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return res.json({
        success: true,
        region,
        base64Audio,
        mimeType: "audio/pcm;rate=24000"
      });
    } else {
      throw new Error("No audio returned from Gemini Speech API");
    }

  } catch (error: any) {
    console.error("Error in /api/tts:", error);
    res.status(500).json({ error: error.message || "Accent Speech Synthesis failed" });
  }
});

// 4. API: Translate text maintaining markdown/HTML structure
app.post("/api/translate", async (req, res): Promise<any> => {
  try {
    const { text, targetLang } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required for translation" });
    }

    const langNames: Record<string, string> = {
      vi: "Tiếng Việt",
      en: "Tiếng Anh",
      ja: "Tiếng Nhật",
      ko: "Tiếng Hàn",
      zh: "Tiếng Trung",
      fr: "Tiếng Pháp"
    };
    const targetLangName = langNames[targetLang] || targetLang;

    const ai = getAiClient();
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        success: true,
        isDemo: true,
        translatedText: `[Bản Dịch Giả Lập - ${targetLangName}]\n\nĐây là bản dịch mẫu sang ${targetLangName} hỗ trợ tệp Âm thanh & Tài liệu của bạn:\n\n${text}\n\n*Chú ý: Hãy cài đặt API Key trong Secrets để kích hoạt dịch thuật thông minh thực tế với Gemini 3.5!*`
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Hãy dịch văn bản học tập hoặc bản ghi âm sau đây sang ${targetLangName}.
YÊU CẦU QUAN TRỌNG:
- Giữ nguyên hoàn toàn cấu trúc định dạng nguyên bản bao gồm: markdown (tiêu đề #, chữ đậm **, danh sách -, số hiệu), các khối HTML hoặc kí kiệu toán học.
- Chỉ dịch nội dung chữ hiển thị, KHÔNG dịch các thẻ định dạng hoặc mã code bên trong.
- Trả về kết quả dịch thô trực tiếp, không bọc thêm bất cứ lời bình hay dấu nháy nào khác.

Nội dung dịch:
"""
${text}
"""`
    });

    return res.json({
      success: true,
      translatedText: response.text || "Bản dịch trống."
    });

  } catch (error: any) {
    console.error("Error in /api/translate:", error);
    res.status(500).json({ error: error.message || "Auto-translation failed" });
  }
});

// 5. API: Translate live audio chunk (captured from micro or system video audio)
app.post("/api/translate-live-audio", async (req, res): Promise<any> => {
  try {
    const { base64Audio, mimeType, sourceLang, targetLang } = req.body;
    if (!base64Audio) {
      return res.status(400).json({ error: "Missing sound chunk data (base64Audio)" });
    }

    const ai = getAiClient();
    
    // Fallback/Demo if Gemini API Key is missing
    if (!process.env.GEMINI_API_KEY) {
      // Simulate real-time translation logs depending on selected languages
      const demoPhrasesMap: Record<string, { trans: string; transViet: string }[]> = {
        en: [
          { trans: "Hello everyone, welcome back to this video tutorial on advanced coding.", transViet: "Xin chào mọi người, chào mừng các bạn quay lại với video hướng dẫn lập trình nâng cao." },
          { trans: "Today we will analyze modern reactive components and architectural paradigms.", transViet: "Hôm nay chúng ta sẽ phân tích các thành phần phản ứng hiện đại và các mô hình kiến trúc." },
          { trans: "It is crucial to understand state synchronization and client-server channels.", transViet: "Việc hiểu rõ về đồng bộ hóa trạng thái và các kênh truyền nhận giữa máy khách & máy chủ là tối quan trọng." },
          { trans: "If you have any questions or ideas, please write down below the comment section.", transViet: "Nếu các bạn có bất kỳ câu hỏi hư ý tưởng nào, hãy viết xuống dưới phần bình luận nhé." }
        ],
        ja: [
          { trans: "皆さん、こんにちは。今回のビデオチュートリアルへようこそ。", transViet: "Xin chào mọi người. Chào mừng đến với video hướng dẫn lần này." },
          { trans: "今日は、システム設計における非同期通信について学んでいきましょう。", transViet: "Hôm nay, chúng ta cùng nhau tìm hiểu về truyền thông bất đồng bộ trong thiết kế hệ thống." }
        ],
        zh: [
          { trans: "大家好，欢迎来到今天的视频教程。今天我们来探讨全栈开发。", transViet: "Chào mọi người, chào mừng đến với video bài giảng hôm nay. Hôm nay chúng ta thảo luận về phát triển full-stack." }
        ]
      };

      const langKey = sourceLang === "auto" ? "en" : sourceLang;
      const phrases = demoPhrasesMap[langKey] || demoPhrasesMap["en"];
      const randomIndex = Math.floor(Math.random() * phrases.length);
      const chosen = phrases[randomIndex];

      return res.json({
        success: true,
        isDemo: true,
        transcription: chosen.trans,
        translation: targetLang === "vi" ? chosen.transViet : `[Demo] Translation of: ${chosen.trans}`
      });
    }

    // Call Gemini with Audio Part input!
    let cleanMime = (mimeType || "audio/webm").split(";")[0].trim().toLowerCase();
    
    const parsedData = await geminiLimiter.run(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: base64Audio
            }
          },
          `You are a real-time speech translation system. 
Listen to this short audio chunk (which is played from a microphone or computer video).
1. Transcribe the audio chunk in its original language (${sourceLang === 'auto' ? 'detect the language' : sourceLang}).
2. Translate the transcribed text to target language: ${targetLang}.
Return the output back strictly in a valid JSON format of:
{
  "transcription": "Original transcript of speech",
  "translation": "Translated text"
}
If there is only silence, ambient noise, or music with no clear speech, you should return black string fields:
{
  "transcription": "",
  "translation": ""
}
Do not write any markdown wrappers or additional text, return only the requested JSON.`
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transcription: { type: Type.STRING },
              translation: { type: Type.STRING }
            },
            required: ["transcription", "translation"]
          }
        }
      });
      return JSON.parse(response.text || "{}");
    });

    return res.json({
      success: true,
      transcription: parsedData.transcription || "",
      translation: parsedData.translation || ""
    });

  } catch (error: any) {
    console.error("Error in /api/translate-live-audio:", error);
    res.status(500).json({ error: error.message || "Failed to transcribe and translate live audio" });
  }
});

// Configure Vite integration and start listening
async function initMiddlewaresAndStart() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server successfully running on http://localhost:${PORT}`);
  });
}

initMiddlewaresAndStart();
