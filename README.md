# 🎓 VietLearn AI Lab — Nền tảng Ôn tập 2D RPG, Sơ đồ tư duy & Lab Âm thanh Đa ngữ

VietLearn AI Lab là một ứng dụng hỗ trợ học tập thông minh toàn diện, tích hợp trí tuệ nhân tạo (Gemini AI) giúp người học tóm tắt kiến thức, tạo sơ đồ tư duy, làm câu hỏi ôn tập, dịch âm thanh trực tiếp và quản lý chi tiêu học tập hiệu quả.

---

## ✨ Các tính năng nổi bật

1. **Thư viện Tài liệu & OCR**:
   * Hỗ trợ tải lên đa định dạng: PDF, Hình ảnh, Âm thanh (MP3, WAV) và Video (MP4).
   * Tự động quét ký tự quang học (OCR) để trích xuất văn bản và tóm tắt học thuật bằng Markdown sinh động.
   * Tự động lập bản đồ tư duy dạng cây phân tầng và tạo bộ câu hỏi trắc nghiệm ôn tập bám sát tài liệu.
   * Hỗ trợ tải và bóc tách nội dung trực tiếp từ các liên kết URL đám mây (Google Drive, Dropbox, v.v.).
2. **Trợ lý AI Thông thái (Chatbot)**:
   * Trò chuyện, giải đáp thắc mắc chuyên sâu dựa trên ngữ cảnh tài liệu học tập đang hoạt động.
   * Nhận diện ngôn ngữ tự nhiên thông minh, linh hoạt rẽ nhánh ý định của người dùng.
3. **Sơ đồ Tư duy Phân tầng (Mindmap)**:
   * Giao diện trực quan hóa kiến thức dạng cây phân cấp rõ ràng, hỗ trợ đóng/mở nút và cập nhật trực tiếp.
4. **Trò chơi RPG 2D & Quizzes**:
   * Tích hợp trò chơi 2D tương tác kết hợp làm bài trắc nghiệm để ôn tập kiến thức một cách thú vị, không gây nhàm chán.
5. **Lab Âm thanh Đa ngữ**:
   * Chuyển đổi văn bản thành giọng nói (TTS) giả lập theo phương ngữ 3 miền: Bắc (crisp/sharp), Trung (deep/solid), và Nam (smooth/breezy).
   * Dịch trực tiếp âm thanh thu từ microphone hoặc hệ thống theo chu kỳ thời gian thực.
6. **Thư viện Kiến thức Fullstack**:
   * Cung cấp giáo trình phân tích giải đáp nhanh cho 8 chuyên đề công nghệ cốt lõi.
7. **Sổ chi tiêu Sinh viên**:
   * Công cụ quản lý tài chính cá nhân, tính toán quỹ tiết kiệm học tập trực quan.

---

## ⚡ Kiến trúc tối ưu hóa hiệu năng & Chịu tải cao

Hệ thống đã được thiết kế lại và tối ưu hóa để phục vụ nhiều người dùng đồng thời mà không bị nghẽn mạng hoặc quá tải máy chủ:

* **Tải lên dạng Multipart Stream (Multer)**:
  * Loại bỏ việc truyền tải chuỗi Base64 dung lượng lớn qua JSON làm phồng 33% băng thông mạng.
  * Backend sử dụng `multer` để nhận file nhị phân thô, ghi trực tiếp xuống ổ cứng tạm thời (`uploads/`) giúp giải phóng bộ nhớ RAM và không gây nghẽn luồng xử lý (Event Loop) của Node.js.
  * Tự động dọn dẹp các tệp tạm ngay lập tức sau khi xử lý xong để tránh lãng phí dung lượng đĩa cứng.
* **Cơ chế giới hạn tần suất (Rate Limiting)**:
  * Áp dụng `express-rate-limit` để chống spam và tấn công DDoS cơ bản.
  * Các API nặng (upload file, tải link, dịch live audio) được cấu hình giới hạn nghiêm ngặt (tối đa 10 request trong 5 phút từ một IP) để bảo vệ tài nguyên máy chủ.
* **Hàng đợi điều phối Gemini API (Concurrency Limiter)**:
  * Tích hợp class `ConcurrencyLimiter` nội bộ quản lý tối đa **3 tiến trình gọi AI đồng thời**.
  * Giúp hệ thống hoạt động ổn định, tránh hoàn toàn lỗi sập hạn ngạch API (`429 Too Many Requests`) khi nhiều người dùng cùng nhấn phân tích tài liệu.
* **Bảo vệ kết nối tải URL trực tuyến**:
  * Áp dụng `AbortController` giới hạn thời gian tải tối đa **15 giây** (Timeout) tránh treo socket máy chủ.
  * Giới hạn kích thước file tải về từ liên kết tối đa **20MB** để ngăn ngừa tràn bộ nhớ RAM (OOM).

---

## 🛠️ Hướng dẫn cài đặt & Chạy ứng dụng

### Yêu cầu hệ thống
* **Node.js**: Phiên bản 18 trở lên.

### Các bước cài đặt và vận hành

1. **Tải mã nguồn và cài đặt thư viện**:
   ```bash
   npm install
   ```

2. **Cấu hình biến môi trường**:
   * Tạo tệp `.env` ở thư mục gốc của dự án (hoặc sao chép từ `.env.example`).
   * Điền khóa API của bạn vào:
     ```env
     GEMINI_API_KEY=your_gemini_api_key_here
     ```

3. **Chạy ứng dụng ở chế độ Phát triển (Development)**:
   ```bash
   npm run dev
   ```
   *Ứng dụng sẽ hoạt động tại địa chỉ: `http://localhost:3000`*

4. **Biên dịch và đóng gói ứng dụng (Production Build)**:
   ```bash
   npm run build
   ```
   *Quá trình build sẽ đóng gói Frontend vào thư mục `dist/` và tạo bundle máy chủ tại `dist/server.cjs`.*

5. **Chạy ứng dụng trong môi trường Production**:
   ```bash
   npm run start
   ```

6. **Khuyến nghị vận hành tải trọng cao (Cluster Mode với PM2)**:
   Để khai thác tối đa tài nguyên đa nhân của CPU và tự động khôi phục máy chủ khi xảy ra sự cố sập luồng, hãy cài đặt và khởi chạy ứng dụng với **PM2**:
   ```bash
   npm install -g pm2
   pm2 start dist/server.cjs -i max --name "vietlearn-ai-lab"
   ```

---

## 📂 Cấu trúc dự án chính

* `server.ts`: Máy chủ Express tích hợp Vite middleware, xử lý API Rate Limiting, Multer Upload, và tích hợp bộ điều phối Gemini API.
* `src/`: Cơ sở mã nguồn Frontend viết bằng React + TypeScript + TailwindCSS.
  * `components/`: Chứa các phân khu tính năng UI biệt lập (Upload, Chatbot, Mindmap, RPG Game, Audio Lab, Budget).
  * `data/`: Dữ liệu bài học công nghệ tĩnh.
  * `types.ts`: Định nghĩa các kiểu dữ liệu dùng chung trong hệ thống.
* `dist/`: Thư mục chứa mã nguồn đã biên dịch sẵn sàng triển khai.
