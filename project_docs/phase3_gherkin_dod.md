# Phase 3: PRD Chuẩn hóa, Gherkin & DoD

> **Tiêu chí nghiệm thu đề xuất.** Kịch bản bên dưới không có nghĩa đã chạy và Pass. Xem [báo cáo kiểm chứng](verification.md) cho phạm vi thực tế.

**Trạng thái:** Bản thiết kế chi tiết Giai đoạn 3
**Ngày lập:** 2026-09-30

## 1. Acceptance Criteria (Gherkin BDD)

### Feature: Upload Media file lớn (Tới 2GB)
**Scenario: Upload thành công video bài giảng**
- **Given** người dùng ở trang "Thư viện tài liệu"
- **And** người dùng chọn file `baigiang.mp4` kích thước 1.5GB
- **When** người dùng nhấn nút "Xử lý bằng AI"
- **Then** hệ thống hiển thị thanh tiến trình tải lên
- **And** hệ thống hiển thị "Đang xử lý nội dung..."
- **And** hệ thống trả về Tóm tắt, Sơ đồ tư duy và Trắc nghiệm trong vòng 3 phút
- **And** file tạm trên hệ thống bị xóa sau khi hoàn thành.

**Scenario: Hết dung lượng đĩa (Backpressure)**
- **Given** máy chủ chỉ còn 3GB dung lượng trống
- **And** người dùng chọn file `video_nang.mp4` kích thước 2GB
- **When** người dùng nhấn nút "Xử lý bằng AI"
- **Then** hệ thống ngay lập tức từ chối và báo lỗi "Server đang quá tải dung lượng, vui lòng thử lại sau"

### Feature: LLM Fallback
**Scenario: Gemini API hết hạn ngạch (Quota 429)**
- **Given** hệ thống đã gọi Gemini vượt quá 15 RPM
- **And** người dùng gửi một đoạn text để tạo Quiz
- **When** API Gemini trả về lỗi 429
- **Then** hệ thống tự động chuyển tiếp request sang OpenRouter (Llama 3.3)
- **And** kết quả được trả về thành công mà người dùng không nhận thấy lỗi hiển thị.

---

## 2. Definition of Done (DoD)

Mỗi Pull Request (PR) hoặc Ticket tính năng được coi là "Hoàn thành" khi:
1. **Mã nguồn (Code)**: Đã được review, pass TypeCheck (`tsc --noEmit`), không có cảnh báo ESLint.
2. **Kiểm thử (Testing)**:
   - Pass toàn bộ Unit Tests (Ví dụ: `multiProvider.test.ts`, `piiGuard.test.ts`).
   - Smoke Test thủ công (Manual Smoke Test) pass các kịch bản Gherkin chính.
3. **Bảo mật (Security)**: Không có secret key nào bị hardcode. Token PII masking hoạt động.
4. **Hiệu năng (Performance)**:
   - Xử lý file không làm RAM máy chủ vượt ngưỡng 200MB/process.
   - Không xuất hiện tình trạng rò rỉ bộ nhớ (Memory Leak) khi retry/fallback.
5. **CI/CD**: Xanh (Green) toàn bộ các pipeline trên GitHub Actions (Lint, Test, Build).

---

## 3. Ma trận Truy vết (Traceability Matrix)

| Req ID | Mô tả Yêu cầu (PRD) | Kịch bản Kiểm thử (Test Case) | File Code Liên quan |
|---|---|---|---|
| REQ-01 | Xử lý file Audio/Video tới 2GB | Upload file >20MB thành công qua Gemini | `geminiFilesService.ts`, `processFile.ts` |
| REQ-02 | STT siêu nhanh qua Groq | Phân tích file audio <24MB | `audioService.ts` |
| REQ-03 | LLM Fallback (Failover) | Xử lý lỗi 429 chuyển sang OpenRouter | `llmOrchestrator.ts`, `providerRouter.ts` |
| REQ-04 | Bảo vệ PII (Masking) | Ẩn số điện thoại, tên, email trước khi gửi AI | `piiGuardService.ts` |
