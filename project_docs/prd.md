# PRD — WorkNote / VietLearn AI Lab

Cập nhật **22/10/2026**. Phạm vi: bản phát triển phục vụ portfolio và học tập. Tài liệu mô tả sản phẩm hiện tại và tiêu chí cần nghiệm thu; kết quả đã chạy nằm riêng trong [verification.md](verification.md).

## 1. Vấn đề cần giải quyết

Người học có nhiều tài liệu nhưng phải chuyển qua nhiều công cụ để đọc, ghi chú, hỏi đáp và tự kiểm tra. WorkNote tập hợp nguồn học, hỗ trợ hỏi AI theo ngữ cảnh và biến nội dung thành sơ đồ/quiz để ôn tập.

Người dùng chính là sinh viên tự học với ghi chú, tài liệu môn học và bài giảng. Người đánh giá portfolio cần một luồng demo ngắn, hướng dẫn cài đặt rõ, mã nguồn dễ lần theo và bằng chứng về giới hạn sản phẩm.

## 2. Phạm vi

**Luồng cốt lõi:** nhập tài liệu → đọc/tra cứu → hỏi theo nguồn → hệ thống hóa kiến thức → ôn tập.

| Phân hệ | Yêu cầu | Trạng thái |
| --- | --- | --- |
| Library | Nhận file, thể hiện loading/error/success, lưu kết quả và chọn tài liệu hoạt động | Có implementation; chưa chạy đủ mọi định dạng |
| NotebookLM | Tạo notebook, quản lý nguồn, đính kèm, chat dựa trên nguồn | Đã chạy luồng TXT + chat local |
| Mind Maps | Chọn Library/Notebook, tạo cây, chỉnh sửa, lưu | Có implementation; xem evidence phiên demo |
| Quiz / RPG | Dùng quiz của tài liệu đang chọn, có bộ mẫu khi chưa có quiz | Có implementation; có ảnh Classic Quiz mẫu |
| AI Chatbot | Hỏi theo tài liệu hoạt động | Có implementation; kiểm chứng riêng với mỗi nhánh provider |
| Meeting | Một workspace: ghi họp local, hội thoại online, văn bản/TTS | Đã hợp nhất UI và có tests mock; M1 chưa nghiệm thu thiết bị/60 phút |
| Video trong Library | Phiên âm và phụ đề từ media đã chọn | Luồng riêng, phụ thuộc provider/mạng; không phải system capture Meeting |
| Knowledge / Spending | Kiến thức tĩnh và quản lý chi tiêu cá nhân | Tiện ích bổ sung, không phải trọng tâm demo |

Ngoài phạm vi hoàn thành hiện tại: SaaS nhiều người dùng, thanh toán, cloud sync đầy đủ, SSO, cam kết SLA, benchmark chịu tải và đánh giá hiệu quả học tập thực nghiệm.

## 3. User stories và tiêu chí nghiệm thu

| ID | Câu chuyện người dùng | Tiêu chí |
| --- | --- | --- |
| US-01 | Tôi muốn thử app mà không có key | Khởi động được UI bằng cấu hình demo; nội dung giả được nhận biết là demo; không coi demo là phân tích thật |
| US-02 | Tôi muốn hỏi nội dung ghi chú | Tạo notebook → tải TXT → đính kèm → hỏi; trả lời kèm provider và nguồn liên quan; nguồn chưa gắn không bị coi là nguồn đã chọn |
| US-03 | Tôi muốn biết AI dùng dữ liệu nào | Có danh sách nguồn đang gắn; đổi nguồn thay đổi ngữ cảnh; câu ngoài nguồn phải được đánh giá bằng bộ câu hỏi chuẩn |
| US-04 | Tôi muốn giữ dữ liệu khi tải lại trang | Library còn trong cùng IndexedDB/origin; notebook còn trên server; ghi rõ chat/profile/chi tiêu ở client |
| US-05 | Tôi muốn nhìn cấu trúc kiến thức | Tạo mindmap từ nội dung chọn, chỉnh sửa và kiểm tra lưu; không nhầm cây mẫu với kết quả AI |
| US-06 | Tôi muốn tự kiểm tra | Quiz hiện câu hỏi, đáp án và giải thích; phân biệt quiz mẫu và quiz từ Library |
| US-07 | Tôi muốn kiểm soát local/cloud | Cấu hình text local-only không fallback lên cloud cho các task tương ứng; UI/docs giải thích các luồng media/dịch riêng |
| US-08 | Tôi muốn hiểu vì sao thao tác lỗi | Có thông báo khi provider không sẵn sàng, hết quota, file không hợp lệ; không spinner vô hạn |

Các tiêu chí chưa được xác nhận chỉ vì có mã nguồn. Danh mục kiểm thử mở rộng nằm tại [test_cases.md](test_cases.md), công việc bổ sung nằm ở [roadmap](future_roadmap.md).

## 3.1. Meeting làm trung tâm — yêu cầu hiện tại

Không còn mục Audio Lab riêng trên sidebar. `MeetingHub` điều phối ba mục, không tự chuyển dữ liệu local sang online:

| ID | Chế độ / yêu cầu | Tiêu chí nghiệm thu |
| --- | --- | --- |
| MT-01 | Ghi họp local | Sherpa Việt int8 trên Windows, một nguồn mic/system; SQLite lưu final raw trước gửi UI; reconnect/export Markdown giữ gap. Không hứa native streaming hoặc đa ngôn ngữ |
| MT-02 | Hội thoại online | Mic trình duyệt SpeechRecognition → Google Translate; consent rõ trước start; phụ đề song ngữ export TXT, không lưu thành session SQLite; không quảng cáo trực tiếp bắt video/system |
| MT-03 | Văn bản & TTS | Dịch văn bản online; Gemini TTS hoặc giọng trình duyệt theo lựa chọn rõ ràng, có Stop/error. Không ngầm gửi transcript họp; giọng trình duyệt không được cam kết offline |
| MT-04 | Tránh thu/phát chồng nhau | Bất kỳ phiên local starting/recording/stopping khóa mic online/TTS; không đọc được trạng thái thì fail-closed. Online audio hoạt động khóa đổi mode trong workspace |
| MT-05 | Vòng đời online | Stop/unmount tắt recognition và tự restart, hủy request/phát audio; response muộn không thêm vào lượt mới; lỗi không tạo bản dịch demo |
| MT-06 | Bảo toàn dữ liệu | Đổi mode không xóa session; rời Meeting không ngầm stop worker local; không overwrite text_raw bằng bản dịch |

**Ngoài phạm vi đợt hợp nhất:** VAD/endpointing, dịch local, AI suggested reply, tự đồng bộ phụ đề online vào SQLite, khóa capture tuyệt đối giữa nhiều client và TTS routing chống echo nâng cao. M1 vẫn phải kiểm chứng lifecycle thiết bị, chất lượng và phiên thật 60 phút; tests UI mock không đóng gate này. Xem [kết quả M1](meeting_m1_results.md) và [roadmap meeting](local_meeting_copilot_plan.md).

## 4. Yêu cầu phi chức năng

- **Khả năng tái tạo:** clone mới, cài dependencies theo lockfile thống nhất, có dữ liệu mẫu và hướng dẫn đúng Windows/Linux.
- **Dữ liệu:** không để API key cloud trong frontend; làm rõ dữ liệu client/server và dữ liệu gửi provider; có ownership trước khi cho nhiều người dùng chung.
- **Tài nguyên:** thống nhất giới hạn file, timeout và cleanup; đo tài liệu nhỏ/lớn trước đặt mục tiêu tải.
- **Khả năng sử dụng:** trạng thái loading/empty/error, thao tác bàn phím, mobile và thông tin nguồn rõ ràng.
- **Chất lượng AI:** kiểm tra tính đúng, mức bám nguồn và đầu ra JSON; HTTP 200 không đủ để nghiệm thu nội dung.
- **Vận hành:** một process là baseline; nhiều instance, backup và observability cần thiết kế/kiểm chứng tiếp.

## 5. Chỉ số cần đo

| Chỉ số | Phương pháp đề xuất | Kết quả hiện có |
| --- | --- | --- |
| Thời gian có câu trả lời | Đo trên file/câu hỏi cố định, ghi máy/model/provider, median và p95 | Chưa benchmark |
| Độ đúng và bám nguồn | Bộ câu hỏi với đáp án, trích đoạn chuẩn, câu không có thông tin | Chưa có tỷ lệ tổng hợp |
| Tài nguyên upload / local LLM | Đo peak RAM/CPU/đĩa và thời gian theo kích thước file | Chưa đo trong phiên này |
| Chi phí AI | Ghi token/request/provider trên cùng bộ dữ liệu | Chưa xác nhận mức tiết kiệm |
| Hoàn thành luồng demo | Người mới làm theo README trên môi trường mới | Đã thử môi trường local có dependencies; clean install còn thiếu |

Không dùng các mục tiêu cũ như “tăng hứng thú 40%”, “dưới một phút” hoặc “tiết kiệm 95%” như kết quả đã đạt.

## 6. Điều kiện đóng mốc portfolio

README + ảnh + file mẫu đầy đủ; clean install được kiểm chứng; CI phân biệt unit/integration; luồng cốt lõi có smoke/E2E; ghi rõ giới hạn và quyền tác giả/assets. Nếu có demo công khai, cần thêm auth/quota/ownership và kiểm tra upload/URL theo roadmap P1.
