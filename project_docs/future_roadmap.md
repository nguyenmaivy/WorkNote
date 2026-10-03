# Roadmap hoàn thiện WorkNote cho portfolio

Rà soát **03/10/2026**. Đây là danh sách đề xuất từ mã nguồn và phiên chạy thực tế, không phải thông báo các mục đã được triển khai. Ưu tiên hoàn thiện một luồng tài liệu → hỏi đáp → ôn tập đáng tin cậy trước khi mở rộng thêm tính năng.

## P0 — Trước khi gửi repository cho nhà tuyển dụng

| ID | Việc cần làm | Bằng chứng / lý do | Tiêu chí hoàn thành |
| --- | --- | --- | --- |
| P0-01 | Thống nhất package manager, runtime và lockfile | Có npm/pnpm lockfile; dependency khai báo ở `package-lock.json` lệch `package.json` | Một package manager được chọn, lockfile khớp; clone mới → frozen install → lint → test → build thành công; ghi `engines`/`packageManager` phù hợp |
| P0-02 | Tách unit test và integration AI trong CI | CI đã có, nhưng chưa cài Python/model; Tutor test gọi model thực | Unit suite chạy không cần key/model; integration job có setup hoặc skip có lý do; không dùng fallback install để che lỗi lockfile |
| P0-03 | Kiểm tra trạng thái AI thực và chuẩn hóa `.env.example` | `/api/status` báo cấu hình, không probe endpoint; placeholder có thể bị hiểu là khóa thật | UI phân biệt configured/ready/error/demo; cấu hình mẫu chạy được theo 3 chế độ README, không chứa placeholder bị coi là key hợp lệ |
| P0-04 | Hoàn thiện một kịch bản demo có thể lặp lại | Đã có ảnh và script NotebookLM; chưa có E2E toàn bộ pipeline Library | TXT mẫu → phân tích → chọn file → hỏi đáp → quiz; reload vẫn đúng dữ liệu; báo lỗi rõ khi model tắt; có script và evidence |
| P0-05 | Đánh giá chất lượng câu trả lời và nguồn | Local đã trả lời thật, nhưng một lần thử đã diễn giải sai tác động của props lên UI | Bộ câu hỏi có đáp án chuẩn và nguồn; chấm đúng/sai, câu ngoài nguồn, câu có prompt injection; ghi kết quả thay vì chỉ check HTTP 200 |
| P0-06 | Thống nhất tên, lời giới thiệu và dữ liệu demo | UI dùng VietLearn, repo WorkNote, package tên `react-example`; một số câu UI ngụ ý mọi dữ liệu local | Tên và mô tả thống nhất; giải thích cloud rõ; dữ liệu demo tách khỏi dữ liệu cá nhân; bổ sung thông tin tác giả/liên hệ đúng thực tế trước gửi hồ sơ |

Bộ README, hướng dẫn ảnh, PRD, kiến trúc và báo cáo hiện tại đã được cập nhật. P0 ở trên là phần engineering/đóng gói còn lại, không yêu cầu xây thêm nhiều module để làm portfolio hấp dẫn hơn.

## P1 — Trước khi mở demo công khai có upload/AI

| ID | Việc cần làm | Hiện trạng | Tiêu chí hoàn thành |
| --- | --- | --- | --- |
| P1-01 | Auth và quyền sở hữu dữ liệu | Notebook API dùng store chung, chưa kiểm tra user; Firebase mới có client init | User A không đọc/sửa/xóa notebook hoặc nguồn của B; auth kiểm tra server-side, có test 401/403 |
| P1-02 | Database, backup và migration | Notebook lưu JSON; Library ở IndexedDB; không phải dữ liệu đều mất khi F5 như roadmap cũ | DB có schema/migration và ownership; backup/restore được thử; rõ dữ liệu client/server; không mất ghi khi nhiều request |
| P1-03 | Đồng nhất giới hạn upload và xử lý lỗi | UI có nhãn 200MB, route có giới hạn 20 MiB/2 GiB; ảnh và notebook chưa theo cùng quy tắc | Một contract theo loại file; UI/API đồng nhất; thử sát giới hạn, MIME sai, cancel, timeout; đo RAM/đĩa; dọn file tạm cả khi lỗi |
| P1-04 | Bảo vệ đường nhập URL | Route fetch có timeout/size nhưng không đủ chứng minh chống SSRF | Kiểm tra protocol, IP nội bộ, DNS và redirect; kiểm tra size trong lúc đọc; tests dùng server/fixture an toàn |
| P1-05 | Ngân sách AI, privacy và khả năng quan sát | Limiter/quota theo tiến trình; một số route không qua text router | Hạn mức theo user, timeout/retry có giới hạn, log không ghi nội dung nhạy cảm, theo dõi provider/latency/cost; kiểm tra PII từng luồng |
| P1-06 | Bộ phụ thuộc embedding có thể tái tạo | Phiên chạy fallback do thiếu `torch` | Requirements riêng cho embedding, setup có hướng dẫn, test xác nhận thật sự chạy neural và test riêng cho fallback |
| P1-07 | Tối ưu bundle và các trạng thái UI | JS build ~1.472 MB (decimal), gzip ~429 KB; mindmap mới có thể hiện cây mẫu; capture ghi lỗi SVG `rbox` khi chuyển tab | Lazy-load tab lớn, đo trước/sau; cây mẫu không bị hiểu là AI; chuyển tab không phát sinh lỗi SVG; kiểm tra bàn phím, mobile, loading/empty/error |
| P1-08 | Kiểm chứng deployment | Production chạy local, chưa deploy từ phiên này | Một môi trường demo có dữ liệu giả, health checks, restart/rollback; người khác mở và làm được walkthrough; kiểm tra giấy phép repo/assets/model trước phát hành |

## P2 — Sau khi luồng chính ổn định

- Đánh giá câu hỏi ôn tập, lịch sử học và spaced repetition bằng dữ liệu đo được.
- Kiểm chứng WebSocket audio/lobby hiện có trước khi mở rộng multiplayer; đo reconnect và độ trễ, không giả định chưa có WebSocket.
- Thử tài liệu dài, PDF scan, DOCX/XLSX và media theo ma trận provider; ghi rõ các trường hợp phụ thuộc cloud.
- Chỉ bổ sung Redis, queue phân tán hoặc nhiều instance khi đã đo được nút thắt; đồng bộ storage, limiter, job và lobby trước khi cluster.
- Bổ sung video demo ngắn và bản README tiếng Anh sau khi kịch bản demo đã ổn định.

## Những tuyên bố cần số đo trước khi đưa vào CV

Không dùng “tiết kiệm 95–98% token”, “chịu hàng nghìn người dùng”, “không còn 429”, “100% offline/toàn bộ dữ liệu an toàn”, “AI chính xác tuyệt đối” làm kết quả đã đạt. Hiện chưa có benchmark để chứng minh. Có thể trình bày phần thực sự có: tích hợp local LLM, phân tách backend, multipart upload, lưu trữ trình duyệt, source-based chat và 29 tests đạt trên môi trường đã ghi nhận.

## Kịch bản trình bày dự án trong 5 phút

1. **30 giây:** bài toán tài liệu rời rạc và luồng học tập chính.
2. **2 phút:** file mẫu → NotebookLM → gắn nguồn → câu hỏi → nhãn local → Mind Maps.
3. **1 phút:** giải thích React/Express/Python, nơi lưu dữ liệu và quyết định local/cloud.
4. **1 phút:** mở tests và báo cáo, phân biệt pass chức năng với chất lượng AI.
5. **30 giây:** nêu một giới hạn thực tế và hướng xử lý, ví dụ quyền sở hữu dữ liệu hoặc clean install.

Ghi đúng phần bạn tự thực hiện, phần dùng thư viện/model và cách dùng công cụ hỗ trợ. Không tự gán số người dùng, vai trò trong nhóm hoặc hiệu quả kinh doanh khi chưa có bằng chứng.
