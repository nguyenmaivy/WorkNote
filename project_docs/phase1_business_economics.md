# Phase 1: Business Idea, AI Economics & System Quotas

> **Tài liệu kế hoạch.** Các chi phí, quota và KPI là giả định/mục tiêu tại thời điểm viết, không phải kết quả kinh doanh đã đo. Trạng thái mới: [PRD](prd.md), [kiểm chứng](verification.md).

**Trạng thái:** Bản thiết kế chi tiết Giai đoạn 1
**Ngày lập:** 2026-09-30

## 1. Phạm vi dự án (Core MVP & In/Out-of-scope)

### In-scope (Phạm vi cốt lõi)
- **NotebookLM & Thư viện tài liệu**: Tải file, bóc tách tri thức, tạo tóm tắt, sơ đồ tư duy, câu hỏi trắc nghiệm. 
- **Chatbot AI**: Hỏi đáp theo ngữ cảnh tài liệu.
- **Mindmap tương tác**: Hiển thị sơ đồ tư duy phân tầng, có thể đóng mở.
- **Audio Lab**: Dịch live, tạo TTS (Text-to-Speech) đa vùng miền.
- **Knowledge Base**: Thư viện kiến thức tĩnh.
- **Budget Tracker**: Quản lý chi tiêu cho sinh viên.
- **Hỗ trợ tệp lớn**: Mở rộng dung lượng file tải lên tới 2GB thông qua Gemini Files API (cho media files).

### Out-of-scope (Hạng mục phụ, thực hiện sau)
- **Game 2D RPG**: Được xem là tính năng phụ, không chặn việc ra mắt Core MVP. Tối ưu refactor sau khi core ổn định.

---

## 2. Mô hình Kinh tế AI (AI Economics)

### Giả định kịch bản sử dụng (Per User/Tháng)
- **Số lần upload file lớn (Video/Audio > 100MB)**: 5 lần/tháng.
- **Số lần upload file nhỏ (PDF, Word, Audio < 24MB)**: 20 lần/tháng.
- **Số lượng câu hỏi chatbot**: 50 câu/tháng.
- **Sử dụng Audio Lab (Dịch Live/TTS)**: 30 phút/tháng (1800 giây).

### Ma trận Nhà cung cấp & Chi phí dự kiến
| Provider | Khả năng (Capability) | Quota (Gói Free/Mặc định) | Chi phí ước tính | Chính sách Fallback |
|---|---|---|---|---|
| **Gemini (Primary)** | Multimodal, Text, Vision, Files API (tới 2GB) | ~15 RPM / 1.500 RPD | $0 (Free tier) | Lỗi 429 -> OpenRouter |
| **Groq** | STT (Whisper-large-v3) cho file < 24MB | ~30 RPM / 14.400s/ngày | $0 (Free tier) | Fallback -> Gemini STT |
| **OpenRouter** | Text/JSON (Llama 3.3 / Qwen) | Rate limit phụ thuộc model | $0 (Free models) | Không retry tiếp |

---

## 3. Thiết kế Quota, Rate Limit & Backpressure

### 3.1. Phân tách giới hạn kích thước file và Quota AI
- **Giới hạn File Size theo loại**:
  - `application/pdf`, `text/*`, `application/vnd...`: Tối đa 20MB (Phân tích bộ nhớ trực tiếp).
  - `audio/*`, `video/*`: Tối đa 2GB (Đẩy qua Gemini Files API).
- File lớn sẽ **không** được parse thành Base64 (tránh tràn RAM), mà dùng Multibart upload lưu trực tiếp ra đĩa tạm, sau đó đẩy lên Cloud qua chunked streaming.

### 3.2. Quản lý hạn ngạch (Quota Tracker)
- Triển khai **Circuit Breaker & Token Bucket** cho từng API Key:
  - Nếu Gemini báo lỗi `429 RESOURCE_EXHAUSTED`, hệ thống đánh dấu "Gemini Exhausted" trong 60 giây và tự động định tuyến toàn bộ traffic sinh text sang OpenRouter.
  - Nếu Groq báo lỗi quá tải, tự động định tuyến xử lý Audio về lại Gemini.

### 3.3. Cơ chế Backpressure cho File 2GB
- **Disk Storage Limits**: Server sẽ check `fs.statfs` dung lượng đĩa khả dụng. Nếu ổ cứng trống < 5GB, tự động reject file upload với mã lỗi `507 Insufficient Storage`.
- **Concurrency / Hàng đợi**:
  - Tối đa **3 concurrent uploads** cho file > 200MB. Các request tiếp theo đưa vào bộ đệm chờ (tối đa 60 giây) hoặc trả về `429 Too Many Requests`.
- **Cleanup Timeout**:
  - Bất kỳ quá trình upload/processing nào quá 5 phút chưa xong sẽ tự động kích hoạt `AbortController` hủy luồng, xóa file đĩa tạm, gọi Gemini Files API xóa file cloud để dọn rác.

---

## 4. Tiêu chí thành công (KPIs & Metrics)
- **Độ tin cậy Upload 2GB**: > 95% thành công, không gây tràn bộ nhớ server (kiểm soát dưới 200MB RAM/process).
- **Tốc độ phản hồi (Latency)**: 
  - Chat & Fallback: < 5 giây.
  - Xử lý tài liệu < 20MB: < 15 giây.
  - Xử lý media 2GB: Phụ thuộc network, có progress bar cập nhật theo thời gian thực (Polling state).
- **Graceful Degradation**: 100% luồng không bị crash khi một provider ngắt kết nối, người dùng vẫn nhận được thông báo rõ ràng hoặc kết quả từ provider dự phòng.
