# 📜 Lịch sử chỉnh sửa & Bài học kỹ thuật (Modification History)

Tài liệu này ghi chép lại chi tiết quá trình nâng cấp mã nguồn, lý do thực hiện các cải tiến và giải thích kiến thức kỹ thuật thu được từ đợt tối ưu hóa hiệu năng chống nghẽn mạng và quá tải hệ thống.

---

## 1. Tải lên tệp tin dạng Multipart (Multer) thay thế Base64 JSON
*   **Vấn đề ban đầu**:
    *   Frontend đọc file bằng `FileReader.readAsDataURL`, chuyển đổi thành một chuỗi Base64 dài và gửi POST JSON lên máy chủ.
    *   **Phân tích tác hại**: Base64 làm phình dung lượng truyền tải dữ liệu trên mạng thêm **33%**. Việc phân tích chuỗi JSON chứa base64 dung lượng lớn (ví dụ 30MB-50MB) bằng `JSON.parse` trên server Node.js chạy đơn luồng (Single-thread) là tác vụ **đồng bộ chặn luồng (synchronous blocking)**. Trong lúc CPU bận parse JSON này, toàn bộ server sẽ đứng hình, tất cả người dùng khác đều bị nghẽn mạng và lag.
*   **Giải pháp đã thực hiện**:
    *   **Frontend ([DocUploadSection.tsx](file:///d:/Nam-4/Build-app-web/WorkNote/src/components/DocUploadSection.tsx))**: Loại bỏ hoàn toàn `FileReader`. Đóng gói file thô trực tiếp vào đối tượng `FormData` và gửi dưới dạng nhị phân `multipart/form-data`.
    *   **Backend ([server.ts](file:///d:/Nam-4/Build-app-web/WorkNote/server.ts))**: Sử dụng thư viện `multer` cấu hình Disk Storage để nhận file. Tệp được truyền tải theo từng mẩu dữ liệu nhỏ (chunks) và ghi thẳng xuống ổ đĩa tạm trong thư mục `uploads/` một cách bất đồng bộ (non-blocking). RAM máy chủ không bị quá tải và Event Loop hoàn toàn giải phóng để phục vụ các yêu cầu khác.
    *   **Dọn dẹp tự động**: Bọc toàn bộ xử lý trong cấu trúc `try-catch-finally`, gọi `fs.promises.unlink` trong phần `finally` để chắc chắn tệp tạm luôn bị xóa bỏ sau khi hoàn thành, tránh rác đĩa cứng.
*   **Bài học kỹ thuật**: Luôn sử dụng Stream và Multipart Form-Data để truyền tải dữ liệu nhị phân lớn trên Node.js/Express. Tuyệt đối tránh gửi Base64 qua JSON cho các tệp tin lớn.

---

## 2. Kiểm soát luồng gọi API bằng Concurrency Limiter (Hàng đợi bất đồng bộ)
*   **Vấn đề ban đầu**:
    *   Khi nhiều người dùng cùng nhấn phân tích tệp hoặc khi tính năng dịch âm thanh trực tiếp gửi request liên tục (6 giây/lần), máy chủ sẽ đồng thời gọi một lượng lớn request HTTPS sang Gemini API.
    *   **Phân tích tác hại**: Việc này làm cạn kiệt băng thông máy chủ và nhanh chóng chạm ngưỡng giới hạn tần suất gọi API của Google AI Studio (lỗi HTTP 429 Too Many Requests), khiến dịch vụ của tất cả mọi người bị ngắt quãng.
*   **Giải pháp đã thực hiện**:
    *   Tự thiết kế một lớp điều phối hàng đợi bất đồng bộ gọn nhẹ tên là `ConcurrencyLimiter` trong [server.ts](file:///d:/Nam-4/Build-app-web/WorkNote/server.ts).
    *   Class này lưu trữ các tác vụ chờ (các hàm promise) trong một mảng `queue` và theo dõi số lượng tác vụ đang hoạt động thông qua biến `activeCount`. Chỉ cho phép tối đa **3 cuộc gọi Gemini hoạt động cùng một lúc**. Khi một tác vụ hoàn thành, tác vụ tiếp theo trong hàng đợi mới được kích hoạt.
*   **Bài học kỹ thuật**: Khi tích hợp các dịch vụ bên thứ ba (đặc biệt là các API dịch vụ AI giới hạn tần suất hoặc tính tiền theo lượt gọi), bắt buộc phải có một cơ chế kiểm soát số lượng tiến trình đồng thời (Concurrency Throttling) để bảo vệ hệ thống và tối ưu chi phí.

---

## 3. Cài đặt giới hạn tần suất chống Spam (Rate Limiting)
*   **Vấn đề ban đầu**:
    *   Máy chủ Express không có bất kỳ rào cản bảo vệ nào. Người dùng hoặc các bot tự động có thể gửi liên tục hàng ngàn request spam làm sập server.
*   **Giải pháp đã thực hiện**:
    *   Tích hợp `express-rate-limit` vào [server.ts](file:///d:/Nam-4/Build-app-web/WorkNote/server.ts).
    *   Cấu hình 2 tầng giới hạn tần suất theo địa chỉ IP:
        *   Tầng API thông thường (`/api/`): tối đa 150 request / phút.
        *   Tầng API tài nguyên nặng (`/api/process-file`, `/api/process-link`, `/api/translate-live-audio`): tối đa 10 request / 5 phút.
*   **Bài học kỹ thuật**: Luôn áp dụng Rate Limiting ở tầng ứng dụng (Application Layer) để bảo vệ server khỏi các lỗi cạn kiệt tài nguyên vô tình hoặc các cuộc tấn công từ chối dịch vụ (DDoS) cơ bản.

---

## 4. Bảo vệ API tải link trực tuyến `/api/process-link`
*   **Vấn đề ban đầu**:
    *   Máy chủ tải file từ URL người dùng gửi lên một cách không kiểm soát. Một liên kết trỏ đến file cực kỳ lớn (như 1GB) hoặc một máy chủ đích phản hồi siêu chậm có thể khiến máy chủ sập RAM hoặc treo socket kết nối kết nối mãi mãi.
*   **Giải pháp đã thực hiện**:
    *   Sử dụng `AbortController` tích hợp trong `fetch` đặt thời gian chờ tối đa (timeout) là **15 giây**. Nếu quá 15 giây, luồng fetch sẽ bị hủy bỏ ngay lập tức để giải phóng kết nối socket.
    *   Kiểm tra tiêu đề `Content-Length` của phản hồi trước khi tải và kiểm tra kích thước byte đệm thực tế sau khi tải, chặn mọi tệp tin lớn hơn **20MB**.
*   **Bài học kỹ thuật**: Dữ liệu đầu vào từ người dùng bên ngoài là không an toàn. Mọi hành động máy chủ chủ động tạo kết nối ra ngoài (outbound HTTP requests) phải luôn đi kèm với kiểm tra kích thước tối đa và thời gian timeout chặt chẽ để bảo vệ máy chủ.
