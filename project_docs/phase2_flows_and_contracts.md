# Phase 2: Low-code, User Flows & Data Contracts

> **Thiết kế luồng/contract.** Đối chiếu mã nguồn trước khi dùng như hợp đồng API hiện hành; xem [kiến trúc thực tế](architecture.md) và [kiểm chứng](verification.md).

**Trạng thái:** Bản thiết kế chi tiết Giai đoạn 2
**Ngày lập:** 2026-09-30

## Meeting contracts — 22/10/2026

Một sidebar Meeting, ba mục: Ghi họp local / Hội thoại online / Văn bản & TTS. Local: mic/system → Python Sherpa → Node → SQLite commit → ordered final/gap replay; `protocol_version`, `session_id`, `seq`, segment identity/revision. Online: browser mic → SpeechRecognition → Google Translate → phụ đề tạm/TXT, không nhập SQLite hay protocol local. Text/TTS không tự lấy transcript local.

Local starting/recording/stopping (bất kỳ session) hoặc status không rõ khóa online audio. Online audio khóa đổi mode trong workspace. Stop/unmount online abort recognition, cancel request/playback và bỏ response muộn; không ngầm stop worker local khi rời mục. Đây không phải distributed lock nhiều client. Contract source: `shared/meeting.ts`, `meetingApi.ts`; yêu cầu MT-01–06 tại [PRD](prd.md), tests tại [test_cases](test_cases.md). Các contracts pipeline file bên dưới giữ phạm vi lịch sử, không thay thế runtime validation hiện tại.

## 1. State Machine: Trạng thái File Pipeline

| Trạng thái (State) | Sự kiện kích hoạt (Event) | Hành động tiếp theo |
|---|---|---|
| `idle` | Người dùng chọn file | Sẵn sàng upload |
| `uploading` | Nhấn "Xử lý" | Stream multipart đến server |
| `processing` | Server nhận đủ stream, đẩy sang AI | Backend gọi OCR/STT/LLM, báo progress |
| `ready` | LLM trả kết quả hợp lệ | Lưu session, update UI, hiển thị Mindmap |
| `error` | Lỗi timeout, quota, format | Hủy xử lý, hiện thông báo lỗi |
| `cancelled` | Nhấn nút "Hủy" hoặc quá timeout | Cleanup file tạm, ngừng API |

---

## 2. Business Rules (Quy tắc logic xử lý)

- **Giới hạn kích thước**: 
  - Text, PDF, Word, Excel: max 20MB.
  - Âm thanh (Groq STT): max 24MB.
  - Media (Gemini Files API): max 2GB.
- **Hàng đợi & Concurrency**: 
  - Upload file <20MB: Xử lý ngay, concurrency 10.
  - Upload file >20MB: Concurrency 3, đưa vào Queue. Lớn hơn Queue giới hạn -> HTTP 429.
- **Timeout**:
  - LLM Request: 30s / request.
  - OCR/STT / Gemini File Polling: 60s.
  - Tổng thời gian upload & process không quá 5 phút.

---

## 3. Zod Data Contracts (Schema chung Frontend/Backend)

```typescript
import { z } from 'zod';

// 1. Phản hồi chung từ API
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
  error: z.string().optional(),
});

// 2. Schema Quiz (Trắc nghiệm)
export const QuizItemSchema = z.object({
  question: z.string().min(5),
  options: z.array(z.string()).length(4),
  answer: z.number().int().min(0).max(3),
  explanation: z.string().optional(),
});

// 3. Schema Sơ đồ tư duy (Mindmap)
export const MindmapNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  children: z.array(z.lazy(() => MindmapNodeSchema)).optional(),
});

// 4. Schema Kết quả phân tích (Core Analysis)
export const FileAnalysisSchema = z.object({
  summary: z.string().min(10),
  extractedText: z.string().optional(),
  quiz: z.array(QuizItemSchema),
  mindmap: MindmapNodeSchema,
});

export type FileAnalysisResponse = z.infer<typeof FileAnalysisSchema>;
```

---

## 4. Ma trận Capabilities & Provider

| Tính năng | Gemini | Groq | OpenRouter | Local Server |
|---|---|---|---|---|
| **Đọc văn bản (PDF, Word)** | Có (Vision/OCR) | Không | Không | Mammoth, Pdf-parse |
| **Nhận diện giọng nói (STT)** | Có (File lớn) | Có (Whisper, <24M) | Không | Không |
| **Xử lý LLM (Summary, Quiz, Mindmap)** | Tốt nhất (Schema) | Không | Llama/Qwen (Text) | Có, ưu tiên local qua OpenAI-compatible endpoint |
| **Ngữ cảnh (Context Window)** | 1M - 2M tokens | 8K - 32K | Tùy model | - |

### Luồng Mindmap tài liệu dài

1. Library gửi `extractedText` của một file; NotebookLM gửi `pageId` để backend tự lấy các nguồn đính kèm.
2. Backend chia từng nguồn theo heading/đoạn văn thành chunk khoảng 9.000 ký tự.
3. LLM tạo dàn ý cục bộ cho từng chunk, tối đa hai tác vụ đồng thời.
4. Các dàn ý được hợp nhất theo batch thành cây tối đa 3 tầng, 8-10 nhánh mỗi cấp.
5. Kết quả lưu `sourceIds` trên node và metadata provider/model để truy xuất nguồn và nhận biết local/cloud.
