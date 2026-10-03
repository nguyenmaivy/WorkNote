# Báo Cáo Refactor Giai đoạn 5 (Hoàn thành)

> **Lịch sử refactor ngày 30/09/2026.** “Hoàn thành” ở tiêu đề chỉ nói về mốc refactor này, không phải toàn bộ sản phẩm sẵn sàng production. Xem [kiểm chứng mới](verification.md).

**Ngày cập nhật:** 2026-09-30
**Mục tiêu:** Tách coupling Frontend và Backend theo Kế hoạch Giai đoạn 5.

## 1. Frontend Refactor (Hoàn tất)
- Đã tách nhỏ thành công `App.tsx` (từ ~600 dòng xuống còn 169 dòng).
- Đã bóc tách hoàn toàn `DocUploadSection.tsx` (từ 944 dòng xuống còn 82 dòng) thông qua custom hook `useDocumentUpload` và các component con.
- Đã tách `ChatbotSection.tsx` (từ 785 dòng xuống còn ~220 dòng).
  - Trích xuất custom hook `useChatbot` quản lý Session/Persistence.
  - Tách UI thành các thành phần: `ChatRecentSessions`, `ChatMessageList`, `ChatComposer`, `ChatContextPicker`.
- Đã bóc tách module game `EduGamePlayground.tsx` (từ 609 dòng xuống còn ~170 dòng).
  - Tách logic của RPG Game (game loop, state, bounding box) thành custom hook `useRpgEngine`.
  - Tách việc render canvas ra `RpgCanvasRenderer` chuyên dụng có `requestAnimationFrame` độc lập (tránh dùng `setState` của React làm chậm rendering).
  - Tách Game UI (Dialog/Questions) ra khỏi engine vẽ.
  - Chuyển logic Quiz truyền thống sang component riêng `ClassicQuiz.tsx`.

## 2. Backend Refactor (Hoàn tất)
- Đã chuẩn hóa route cực kỳ phức tạp `/api/process-file`.
  - Giữ lại Route validation (`processFile.ts`).
  - Tạo Controller (`processFileController.ts`).
  - Đẩy toàn bộ Pipeline (STT, LLM, PII guard, Rate limit) sang tầng Service (`processFileService.ts`).
- Đã tối ưu wrapper IPC Node ↔ Python (`tutorService.ts`).
  - Cấu hình giới hạn bộ đệm STDOUT/STDERR (`MAX_STDOUT_BYTES`) để tránh sập (OOM) nếu mô hình LLM in log quá lớn (hoặc bị vòng lặp vô tận).

## 3. Trạng thái Build & Kiểm thử
- Toàn bộ frontend và backend đều compile thành công sau khi tái cấu trúc. Không có cảnh báo lỗi import. Lệnh `pnpm build` chạy ổn định.
- Kích thước Bundle sau khi chia tách vẫn ở mức tối ưu (~1.45 MB), không bị trùng lặp chunk.
- Đạt được mục tiêu Decoupling hoàn toàn Giai đoạn 5 theo kiến trúc Clean Code mà không gây ra regression tính năng.

## 4. Mind Maps dùng chung Library và NotebookLM
- Tab Mind Maps có bộ chọn nguồn `Library / NotebookLM` và dùng chung `MindMapViewer`.
- Library dùng `extractedText` của file đang chọn; kết quả được lưu lại vào IndexedDB cùng file.
- NotebookLM phân giải `pageId` ở backend, lấy toàn bộ nguồn đã đính kèm và lưu cây vào notebook.
- Tài liệu dài được chia theo heading/đoạn văn, tạo dàn ý từng chunk rồi hợp nhất theo nhiều tầng.
- Giới hạn 36 chunk được lấy mẫu trải đều khi context quá lớn; response trả thống kê `totalChunks`, `analyzedChunks`, `sampled`.
- Các node giữ `sourceIds` để có thể truy ngược nguồn tạo ra nhánh kiến thức.
- Sinh mindmap dùng chính sách local-first và cloud fallback của `ProviderRouter`.
- Test backend được cô lập khỏi `data/notebook.json`, tránh dữ liệu giả ghi vào store người dùng.

## 5. Local LLM tích hợp
- Model `Qwen2.5-1.5B-Instruct Q4_K_M` được lưu cục bộ trong `models/` (~1,1 GB).
- Python server cung cấp API tương thích OpenAI tại `http://127.0.0.1:11434/v1`.
- Node supervisor tự khởi động/dừng model cùng WorkNote và kiểm tra health định kỳ.
- Model chỉ nạp một lần; NotebookLM, Mind Maps và Tutor dùng chung tiến trình.
- Cổng local được khóa trước khi nạp model để ngăn nhiều instance sau hot-reload.
- Script `python scripts/setup_local_llm.py` tái tạo `.venv`, cài runtime và tải model trên máy mới.
- Cấu hình mặc định CPU dùng khoảng 1,5 GB RAM; có thể thay wheel CUDA/Vulkan và offload GPU.
