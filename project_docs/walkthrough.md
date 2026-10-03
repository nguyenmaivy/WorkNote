# Walkthrough: Hoàn thành Triển khai Multi-Provider & STT Engine (Phase 1)

> **Ghi chép lịch sử Phase 1.** Hướng dẫn hiện tại: [sử dụng bằng ảnh](user_guide.md). Các mức tiết kiệm 95–98%, chất lượng “100%” hoặc giới hạn bên dưới chưa được kiểm chứng lại bằng benchmark; không dùng làm số liệu portfolio. Xem [verification.md](verification.md).

Chúng ta đã triển khai thành công toàn bộ 8 điểm kỹ thuật đã thống nhất trong **Phase 1** nhằm giải quyết triệt để lỗi khi upload file MP3/Audio lớn và tối ưu hóa 95-98% lượng token tiêu thụ.

---

## 1. Những Thay Đổi Chính Đã Thực Hiện

### A. Tầng Cấu hình & Quản lý Nhà cung cấp (`server/config.ts`, `.env.example`, `/api/status`)
- Bổ sung cấu hình cho `GROQ_API_KEY`, `OPENROUTER_API_KEY`, và danh sách `OPENROUTER_MODELS`:
  - `meta-llama/llama-3.3-70b-instruct:free`
  - `qwen/qwen-2.5-72b-instruct:free`
- Cung cấp hàm ma trận năng lực `getAvailableProviders()`:
  - `hasStt`: Groq || Gemini
  - `hasLlm`: Gemini || OpenRouter
  - `hasVision`: Gemini
- Thêm endpoint mới `GET /api/status` trả về trạng thái chi tiết của từng provider để client hiển thị banner chính xác.

### B. Gemini Files API Helper (`server/services/geminiFilesService.ts`)
- Đóng gói đầy đủ **quy trình 4 bước chuẩn mực** cho file media lớn (tới 2GB), chấm dứt hoàn toàn giới hạn 20MB của Base64 inlineData:
  1. `ai.files.upload` với `mimeType` từ file đĩa.
  2. Polling cho tới khi file đạt trạng thái `ACTIVE` (với timeout an toàn 60s).
  3. Sử dụng `fileData: { fileUri, mimeType }` trong request.
  4. Luôn gọi `ai.files.delete` trong khối `finally` để dọn dẹp dung lượng.

### C. Dịch vụ Âm thanh & STT Riêng biệt (`server/services/audioService.ts`)
- **Không dùng Base64 cho STT**: Gửi trực tiếp stream nhị phân (`fs.openAsBlob` + `FormData`) từ đĩa.
- Tách bạch 2 hàm chuyên biệt:
  - `transcribePlain(filePath, mimeType, fileSize, filename)`: Dùng Groq Whisper `whisper-large-v3` (với file audio <= 24MB), fallback sang Gemini Files API (hỗ trợ cả video và file lớn).
  - `transcribeTimed(filePath, mimeType, fileSize, filename)`: Dùng Groq Whisper với `response_format: "verbose_json"`, tính toán chính xác `dur = Number((seg.end - seg.start).toFixed(2))`, fallback sang Gemini Files API trả về đúng các cue thời gian.

### D. Trích xuất Tài liệu Cục bộ & Heuristic PDF Scan (`server/services/documentService.ts`)
- Bóc tách văn bản offline 100% tại máy chủ cho:
  - Word (`.docx` qua `mammoth`)
  - Excel (`.xlsx`, `.xls` qua `xlsx`)
  - Văn bản thuần (`.txt`, `.md`, `.csv`, `.html`)
  - PDF (`.pdf` qua `pdf-parse`)
- **Heuristic thông minh nhận diện PDF Scan**: Nếu file PDF > 50KB nhưng trích xuất được dưới 100 ký tự chữ, hệ thống tự động nhận diện đây là tài liệu scan/ảnh và chuyển tiếp sang Gemini Multimodal OCR để không làm mất tính năng đọc scan.

### E. Điều phối LLM & Fallback Linh hoạt (`server/services/llmOrchestrator.ts`)
- **Gemini Primary Engine**: Sử dụng `FILE_ANALYSIS_RESPONSE_SCHEMA` để bảo toàn 100% chất lượng mindmap 3 tầng và trắc nghiệm quiz.
- **Quy tắc chuyển mạch (Failover)**:
  - Lỗi 429 (`RESOURCE_EXHAUSTED` / Hết quota): **Chuyển ngay lập tức** sang OpenRouter Fallback, không retry lãng phí thời gian.
  - Lỗi 503 (`UNAVAILABLE`): Thử lại tối đa 1 lần sau 1 giây trước khi chuyển OpenRouter.
- Khi fallback OpenRouter: Sử dụng prompt ép cấu trúc JSON nghiêm ngặt + lọc qua `looseParseJson` và `normalizeAnalysis` để đảm bảo không bị crash khi cấu trúc thiếu trường.

### F. Vệ binh Bảo mật Thông tin Cá nhân (`server/services/piiGuardService.ts`)
- Đổi token ẩn danh sang chuẩn `__PII_LOAI_STT__` (như `__PII_NAME_1__`, `__PII_EMAIL_1__`, `__PII_CCCD_1__`) để chống việc LLM tự ý dịch hoặc sửa đổi khoảng trắng.
- Bổ sung hàm đệ quy `unmaskDeep(obj, vault)` duyệt và phục hồi thông tin cá nhân trên toàn bộ các trường của JSON (`summary`, `quiz[].question`, `quiz[].options`, `quiz[].explanation`, `mindmap`, `extractedText`).

### G. Chuẩn hóa Endpoint & Client Multipart
- `server/routes/processFile.ts`:
  - Multer ghi đĩa trực tiếp.
  - Hỗ trợ Input Normalizer: nếu client cũ gửi `{ base64Data }`, server ghi ngay ra file đĩa tạm thời rồi nhập chung một pipeline.
  - Xử lý UX tinh tế: Nếu người dùng chỉ có `GROQ_API_KEY` (chưa có key LLM), server vẫn trả về transcript thành công mà không hủy request.
- `server/routes/transcribe.ts`: Nhận multipart file trực tiếp, gọi `transcribeTimed`.
- `src/components/AiVideoLab.tsx`: Bỏ hoàn toàn `fileToBase64`, chuyển sang lấy `Blob` và gửi `FormData` multipart.

---

## 2. Kết Quả Kiểm Thử (Verification)

1. **Kiểm tra Type TypeScript (`tsc --noEmit`)**:
   - `tsc --noEmit` hoàn thành với **0 lỗi**.
2. **Kiểm tra Unit Test (`multiProvider.test.ts` & `piiGuard.test.ts`)**:
   - `getAvailableProviders`: Trả về đúng ma trận năng lực theo các API key đã nạp.
   - `extractDocumentText`: Trích xuất text tiếng Việt và làm sạch HTML tag chuẩn xác.
   - `looseParseJson`: Vá thành công JSON bị cắt cụt.
   - `dur = end - start`: Tính toán thời lượng phụ đề chính xác đến hàng phần trăm giây.
   - `unmaskDeep`: Phục hồi nguyên vẹn các trường lồng sâu trong quiz và mindmap.
   - Toàn bộ các bài test liên quan đều đạt 100% (Pass).
