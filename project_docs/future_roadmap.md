# 🗺️ Kế hoạch hoàn thiện dự án VietLearn AI Lab (Roadmap)

Tài liệu này vạch ra các hướng phát triển tiếp theo để nâng cấp VietLearn AI Lab từ một phiên bản Lab thử nghiệm (Prototype) thành một sản phẩm học tập hoàn chỉnh, sẵn sàng thương mại hóa và phục vụ hàng ngàn người dùng thực tế.

---

## 1. Hệ thống Quản lý Người dùng (Authentication & Authorization)
*   **Vấn đề hiện tại**: Dự án chưa có hệ thống tài khoản. Tất cả người dùng đều dùng chung một bộ nhớ tạm (React State) và chia sẻ khóa `GEMINI_API_KEY` của hệ thống.
*   **Giải pháp đề xuất**:
    *   Tích hợp dịch vụ xác thực như **Firebase Auth**, **Auth0** hoặc tự xây dựng với **JWT** (JSON Web Tokens) kết hợp mã hóa mật khẩu `bcrypt`.
    *   Phân quyền người dùng: Người dùng miễn phí (Free Tier - có hạn mức dùng thử AI) và người dùng trả phí (Premium Tier - mở khóa không giới hạn).
    *   Bảo mật API Key: Không cho phép người dùng tự cấu hình API Key ở Client, thay vào đó máy chủ quản lý API Key an toàn ở file `.env`.

## 2. Tích hợp Cơ sở Dữ liệu (Database Integration)
*   **Vấn đề hiện tại**: Toàn bộ dữ liệu (file upload, quizzes sinh ra, sơ đồ tư duy, lịch sử chat, budget chi tiêu) sẽ bị xóa sạch khi người dùng tải lại trang (F5).
*   **Giải pháp đề xuất**:
    *   Tích hợp hệ quản trị cơ sở dữ liệu quan hệ **PostgreSQL** (hoặc **MongoDB** cho cấu hình sơ đồ tư duy linh hoạt).
    *   **Lưu trữ dữ liệu**:
        *   Bảng `users`: Thông tin người dùng, cấp độ tài khoản, lịch sử học tập.
        *   Bảng `documents`: Lưu trữ nội dung văn bản đã OCR, kết quả tóm tắt, sơ đồ tư duy JSON và câu hỏi trắc nghiệm ôn tập. Khi người dùng khác tải lên file trùng (check hash SHA-256), chỉ cần đọc trực tiếp từ DB mà không cần gọi sang Gemini API (giúp tiết kiệm **95%** chi phí vận hành).
        *   Bảng `chat_histories`: Lưu trữ các cuộc hội thoại hỏi đáp để người dùng có thể xem lại bài học cũ.

## 3. Nâng cấp Lab Âm thanh qua WebSockets & WebRTC
*   **Vấn đề hiện tại**: Tính năng live translation ([AudioSpeechLab.tsx](file:///d:/Nam-4/Build-app-web/WorkNote/src/components/AudioSpeechLab.tsx)) đang gửi request HTTP POST mỗi 6 giây. Việc này tạo ra độ trễ cao và tốn tài nguyên kết nối TCP.
*   **Giải pháp đề xuất**:
    *   Sử dụng thư viện **Socket.io** thiết lập kết nối song công liên tục (WebSocket).
    *   Frontend stream dữ liệu âm thanh dạng nhị phân thô (Raw PCM / WebM chunks) liên tục với độ trễ thấp (< 1 giây).
    *   Máy chủ nhận luồng âm thanh và trung chuyển sang API Stream của Gemini hoặc Whisper để trả về văn bản dịch tức thời (Real-time Speech Translation).

## 4. Tăng tính tương tác cho Game RPG 2D
*   **Vấn đề hiện tại**: Trò chơi RPG hiện tại ở dạng cơ bản, chưa liên kết sâu với tiến trình học tập.
*   **Giải pháp đề xuất**:
    *   Đồng bộ hóa kết quả: Lưu điểm số, thời gian làm bài, tỷ lệ trả lời đúng của học sinh vào cơ sở dữ liệu.
    *   Bảng xếp hạng (Leaderboard): Hiển thị bảng vinh danh các học sinh có điểm số RPG cao nhất trong tuần.
    *   Cơ chế đổi thưởng: Liên kết với tính năng Sổ chi tiêu sinh viên (Student Budget Tracker), học sinh làm bài tập RPG đúng sẽ được cộng "tiền thưởng ảo" vào quỹ chi tiêu học tập trong app.

## 5. Đồng bộ hóa Cache phân tán với Redis
*   **Vấn đề hiện tại**: Khi chạy Cluster Mode với PM2 trên nhiều core CPU (hoặc nhiều server vật lý), cache lưu trong bộ nhớ RAM cục bộ của tiến trình này sẽ không thể dùng chung cho tiến trình khác.
*   **Giải pháp đề xuất**:
    *   Cài đặt máy chủ **Redis** làm bộ nhớ đệm dùng chung cho toàn hệ thống.
    *   Sử dụng Redis để lưu trữ:
        *   Trạng thái Rate Limiting của người dùng (đồng bộ IP blacklist).
        *   Kết quả phân tích tài liệu (SHA-256 cache).
        *   Phiên đăng nhập (Session store) của người dùng.

## 6. Container hóa & Quy trình Triển khai tự động (Docker & CI/CD)
*   **Vấn đề hiện tại**: Việc cấu hình môi trường chạy máy chủ thủ công dễ xảy ra lỗi không đồng nhất hệ điều hành (Windows vs Linux).
*   **Giải pháp đề xuất**:
    *   Viết tệp `Dockerfile` đóng gói toàn bộ ứng dụng Node.js + React.
    *   Thiết lập luồng tự động build và deploy **CI/CD** (GitHub Actions / GitLab CI) đẩy container lên các nền tảng đám mây như Google Cloud Run, AWS ECS hoặc Render khi có code mới.
