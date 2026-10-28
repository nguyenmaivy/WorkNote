# Hướng dẫn sử dụng WorkNote

Ảnh chụp ngày **03/10/2026**, từ ứng dụng chạy local ở độ phân giải 1600 × 1000. Giao diện hiện dùng tên **VietLearn AI Lab**. Các nhãn thao tác bên dưới giữ nguyên theo UI để dễ tìm.

Trước khi bắt đầu, làm theo [hướng dẫn cài và chạy](../README.md#chạy-dự-án). Muốn có phản hồi thực tế như ảnh NotebookLM, cần local LLM hoạt động. Nếu chỉ chạy demo, câu trả lời là nội dung giả lập.

## 1. Làm quen với Library

Mở `http://localhost:3000`. Thanh bên trái chứa Library, AI Chatbot, NotebookLM, Mind Maps, RPG Games, Meeting, Knowledge và Spending. Cập nhật điều hướng **22/10/2026**: Audio Lab đã chuyển vào Meeting; các ảnh 03/10 phía dưới là ảnh lịch sử, chưa phản ánh thanh điều hướng mới.

![Library khi chưa có tài liệu](screenshots/01-library.png)

- **Browse Files** hoặc kéo thả file để thêm tài liệu vào Library.
- Khi phân tích thành công, chọn tài liệu để xem phần **AI Summary & Document Analysis** và dùng tài liệu đó làm ngữ cảnh cho các tab liên quan.
- Bắt đầu bằng [react-study-note.txt](examples/react-study-note.txt), một file nhỏ không có thông tin cá nhân. Các định dạng khác phụ thuộc bộ trích xuất và provider tương ứng.

Ảnh trên minh họa màn hình nhập tài liệu, chưa phải bằng chứng pipeline Library đã phân tích mọi định dạng. Nhãn giới hạn file trên UI chưa đồng nhất với server; xem [các giới hạn đã ghi nhận](verification.md).

## 2. Tạo notebook và đính kèm nguồn

1. Chọn **NotebookLM** ở thanh bên.
2. Nhấn dấu **+** có tooltip **Tạo notebook** (hoặc nút cùng tên khi danh sách trống).
3. Đổi tên thành **Ôn tập React — Props & State**, nhấn **Lưu tên**.
4. Ở cột **Nguồn tài liệu**, nhấn **Tải tài liệu lên** và chọn [react-study-note.txt](examples/react-study-note.txt).
5. Nhấn **+ Đính kèm vào trang** trên thẻ nguồn. Kiểm tra nhãn đổi thành **✓ Đã đính kèm** và phần giữa hiện **1 nguồn**.

![Notebook đã được gắn nguồn React mẫu](screenshots/02-notebook-sources.png)

**Upload và đính kèm là hai bước riêng.** Một nguồn nằm trong danh sách chưa có nghĩa nó đã được dùng cho notebook đang chọn. Library và NotebookLM cũng chưa tự đồng bộ nguồn với nhau.

Ô `https://...` và nút **Thêm** dùng cho nguồn URL. Với link yêu cầu đăng nhập hoặc YouTube không có phụ đề, không nên mặc định rằng ứng dụng lấy được nội dung. Luồng URL chưa được kiểm chứng trong bộ ảnh này.

## 3. Hỏi nội dung tài liệu

Nhập vào ô **Hỏi về nội dung trong nguồn tài liệu...** rồi nhấn **Gửi** hoặc Enter:

> Theo tài liệu, state là gì và hook nào dùng để khai báo state? Trả lời ngắn trong 2 câu.

![Phản hồi thực tế từ model local với nguồn đã gắn](screenshots/03-notebook-chat.png)

Trong phiên chụp, API trả `provider: local`, `model: worknote-qwen2.5-1.5b` và snippet từ file mẫu. Nhãn **Local · worknote-qwen2.5-1.5b** xuất hiện dưới phản hồi. Câu trả lời xác định state là dữ liệu component quản lý và `useState` là hook khai báo state.

Bạn cũng có thể dùng các gợi ý tóm tắt, tạo câu hỏi hoặc giải thích. Đây là yêu cầu gửi trong hội thoại; câu hỏi được AI viết ra ở đây **không tự trở thành bộ quiz của game**.

Nếu câu trả lời sai hoặc không bám nguồn, đối chiếu văn bản, kiểm tra nguồn đã gắn và thử câu hỏi cụ thể hơn. Model nhỏ có thể suy diễn sai; một phản hồi thành công không bảo đảm độ chính xác cho mọi câu hỏi.

## 4. Tạo sơ đồ tư duy

1. Chọn **Mind Maps** ở thanh bên.
2. Trong vùng nội dung, chọn **NotebookLM** (hoặc **Library** nếu muốn dùng file đã phân tích).
3. Chọn notebook có nguồn trong danh sách.
4. Nhấn **Tạo sơ đồ**. Nếu đã có cây hoặc editor khởi tạo cây mẫu, nút có thể hiện **Tạo lại**.
5. Kiểm tra nhãn provider. Editor có các kiểu bố cục, thêm node bằng Tab/Enter, sửa bằng F2 và kéo thả.

![Mindmap trả về trong phiên chạy local](screenshots/04-mindmaps.png)

**Giới hạn được giữ nguyên trong ảnh:** API local trả cây có nhánh “Ý chính/Ý phụ”, chưa hệ thống hóa tốt nội dung React. Ảnh xác nhận luồng chọn nguồn → gọi AI → hiển thị cây, không phải kết quả đạt tiêu chí chất lượng kiến thức. Cần cải thiện prompt/validation và đo chất lượng; xem P0-05 và P1-07 trong [roadmap](future_roadmap.md).

## 5. Thử quiz và trò chơi

Mở **RPG Games**. Có ba mục **Farm Game**, **RPG Quest**, **Classic Quiz**.

![Giao diện Farm Game](screenshots/05-rpg.png)

Chọn **Classic Quiz**, chọn một đáp án, xem giải thích rồi chuyển câu tiếp theo.

![Classic Quiz với bộ câu hỏi mặc định](screenshots/07-classic-quiz.png)

Hai ảnh dùng giao diện và câu hỏi mẫu có sẵn, không phải quiz sinh từ notebook React. Để dùng quiz của tài liệu, phân tích file ở Library và chọn file có quiz trước khi mở game. Chưa kiểm chứng multiplayer, toàn bộ vòng chơi hoặc lưu tiến trình game trong phiên này.

## 6. Các tiện ích bổ sung

- **AI Chatbot:** chọn tài liệu Library làm ngữ cảnh rồi hỏi đáp; tách với hội thoại NotebookLM.
- **Knowledge:** xem các chuyên đề kiến thức có sẵn.
- **Meeting:** xem ba chế độ bên dưới; không còn mục Audio Lab riêng.
- **Spending:** giao diện giao dịch, biểu đồ và mục tiêu tiết kiệm. Ảnh dưới dùng dữ liệu mẫu mặc định của ứng dụng, không phải dữ liệu tài chính cá nhân.

![Spending với dữ liệu mẫu mặc định](screenshots/06-spending.png)

## 6.1. Meeting — local, hội thoại online và TTS

### Ghi họp local
1. Mở **Meeting → Ghi họp local** trên `http://localhost:3000`.
2. Chuẩn bị env `.venv-meeting-m0` Python 3.10 và model Sherpa Việt int8 theo [M0](meeting_m0_results.md); xem [giới hạn M1](meeting_m1_results.md). Thiếu env/model phải báo lỗi, không có fallback transcript giả.
3. Chọn **Microphone** hoặc **System audio**, chọn đúng thiết bị; xác nhận consent rồi **Start transcription**. Chỉ ghi sau thao tác này.
4. Transcript đến theo cửa sổ khoảng 5 giây, không phải subtitle streaming tức thời. Đọc cả gap/error.
5. **Stop**, rồi export Markdown hoặc mở lại phiên. **Reconnect** tải lại final đã lưu. Chỉ xóa phiên đã dừng/lỗi sau khi xác nhận; export đã tải là bản riêng.

Rời mục không ngầm dừng worker local; quay lại để Stop. Nếu có phiên local đang chạy, mic online/TTS bị khóa kể cả khi bạn đang xem một phiên khác.

### Hội thoại online
1. Dừng phiên local trước, chọn **Hội thoại online**.
2. Chọn ngôn ngữ gốc/đích; xác nhận có consent và chấp nhận xử lý online.
3. **Bắt đầu dịch live**, cấp quyền mic khi trình duyệt yêu cầu. Luồng này dùng mic trình duyệt, không trực tiếp lấy tiếng video/system. Browser STT có thể cần mạng; văn bản gửi Google Translate.
4. **Dừng mic online** trước đổi chế độ. **Xuất phụ đề TXT** trước khi rời mục nếu muốn giữ; phụ đề không tự lưu SQLite. Không có hạn mức miễn phí/SLA được cam kết.
5. Nếu dịch không theo kịp, UI dừng rõ ràng thay vì bỏ lời nói âm thầm; bắt đầu lại với tốc độ nói phù hợp.

### Văn bản & TTS
Nhập tối đa 5.000 ký tự → chọn ngôn ngữ → **Dịch văn bản online**. Chọn **Đọc bằng Gemini online** (cần Gemini key; gửi text lên cloud), **Đọc bằng trình duyệt**, hoặc **Đọc bản dịch**. Chọn vùng giọng cho Gemini, tốc độ và cao độ cho browser voice; cao độ không áp dụng Gemini. **Dừng phát / hủy** để hủy. Không có transcript local tự đính kèm vào công cụ này.

Nếu không xác minh được trạng thái local, mic online/TTS tạm khóa để tránh echo. Browser voice phụ thuộc thiết bị, không bảo đảm offline. Chỉ kiểm tra loại trừ trong workspace + trạng thái backend; chưa bảo đảm khóa tuyệt đối với nhiều client thao tác đồng thời. Chưa nghiệm thu capture thật 60 phút, VAD/dịch local/AI reply chưa có.

## 7. Dữ liệu được lưu ở đâu?

| Nội dung | Vị trí |
| --- | --- |
| Tài liệu và kết quả Library | IndexedDB trong trình duyệt |
| Notebook, nguồn và mindmap notebook | `data/notebook.json` trên server |
| Chat notebook, profile, chi tiêu | localStorage trên trình duyệt |
| Meeting local | `data/meeting.sqlite` trên server local, kèm WAL/SHM; chưa mã hóa cấp app |
| Phụ đề hội thoại online / văn bản dịch | State màn hình; export TXT là file riêng, không tự lưu vào phiên local |

Giữ nguyên origin và browser profile để mở lại dữ liệu client. Xóa site data hoặc dùng cửa sổ ẩn danh có thể làm mất/không thấy dữ liệu đó. Server hiện chưa phân quyền notebook theo tài khoản.

## 8. Tái tạo bộ ảnh

Script [capture-demo.mjs](capture-demo.mjs) thao tác bằng trình duyệt thật, dùng file mẫu, kiểm tra phản hồi chat/mindmap và chụp PNG. Không mock API hoặc chèn kết quả AI giả.

Ở thư mục gốc, với app và local model đang chạy:

```powershell
# Chỉ cần nếu máy chưa có Chromium cho Playwright:
npx playwright install chromium
node project_docs/capture-demo.mjs
```

Script yêu cầu **notebook store trống** để không đưa tên/nội dung riêng vào ảnh. Nếu đã có dữ liệu, dùng checkout demo riêng; không xóa dữ liệu để ép chạy script. Script dùng browser profile mới, tạo notebook/nguồn mẫu rồi xóa đúng các bản ghi nó tạo trong `finally`; file ảnh và [capture-report.json](screenshots/capture-report.json) được ghi lại. Dừng tiến trình đột ngột có thể để lại bản ghi mẫu.

Nếu dùng cổng khác, đặt `$env:WORKNOTE_DEMO_URL = "http://localhost:3002"` trước khi chạy. Chỉ dùng script trên app demo local; script có thao tác tạo/xóa dữ liệu và gọi AI. AI có thể trả nội dung khác giữa các lần chạy. `pass` chỉ nói về luồng kỹ thuật; `completed_with_page_errors` nghĩa là đã chụp xong nhưng có lỗi JavaScript. Phiên ảnh này có một lỗi SVG khi chuyển tab, được giữ nguyên trong report. Script không chấm chất lượng model.
