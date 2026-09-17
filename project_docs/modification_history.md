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

---

## 5. Quy hoạch kiến trúc Hugging Face, Bảo vệ Dữ liệu Cá nhân & Hệ thống Multi-Model
*   **Bối cảnh & Nhu cầu**:
    *   Người dùng định hướng dự án phục vụ học tập nhưng công việc hàng ngày đặt nặng yếu tố **bảo mật dữ liệu cá nhân**.
    *   Mô hình hiện tại đang phụ thuộc vào Google Gemini Cloud API; các dữ liệu ghi chú nhạy cảm có nguy cơ rò rỉ ra bên ngoài máy tính cá nhân.
*   **Phân tích & Giải pháp kỹ thuật**:
    *   Khởi tạo tài liệu quy hoạch kiến trúc tại `project_docs/huggingface_integration_architecture_plan.md`.
    *   Thiết lập mô hình kiến trúc **Zero Data Egress** (Dữ liệu không rời máy) bằng cách khai thác môi trường Python nội bộ (`.venv` với `transformers`, `torch`).
    *   Phân chia hệ thống thành **4 Đội Model chuyên biệt**:
        1. *Đội 1 (Sentry / Guard)*: Xử lý PII Redaction & Anonymization trước khi dữ liệu được xử lý.
        2. *Đội 2 (Librarian / Thủ thư)*: Tích hợp mô hình sinh Vector Embedding (`bge-m3` hoặc `paraphrase-multilingual-MiniLM-L12-v2`) nâng cấp thuật toán TF-IDF thô sơ của `embedService.ts`.
        3. *Đội 3 (Tutor / Gia sư)*: Chạy mô hình ngôn ngữ nhỏ gọn cục bộ (`Qwen2.5-1.5B/3B-Instruct` hoặc GGUF quantize 4-bit) để tóm tắt, sinh mindmap và quiz RPG mà không cần Internet.
        4. *Đội 4 (Scribe / Thư ký)*: Dùng `whisper-tiny` cho âm thanh riêng tư.
    *   Xây dựng khung kỹ thuật viết Prompting chuyên sâu (Khung C.R.E.A.T.E, phòng chống Prompt Injection, kỹ thuật Chain-of-Thought và cưỡng chế định dạng JSON).
*   **Bài học kỹ thuật**: Trong AI Engineering hiện đại, bảo mật dữ liệu cá nhân không chỉ nằm ở tường lửa mạng, mà nằm ở quyền kiểm soát vị trí thực thi mô hình (Local Inference) và nguyên tắc tối thiểu hóa dữ liệu (Data Minimization / Anonymization) trước khi đưa vào ngữ cảnh của AI.

---

## 6. Hiện thực hóa Đội 2 (Semantic Vector Search) và Đội 1 (PII Guard Anonymizer)
*   **Mục tiêu thực hiện**:
    *   Triển khai Đội 2 (The Librarian) thay thế cơ chế tìm kiếm từ khóa Bag-of-Words bằng Hugging Face Dense Vector Embedding đa ngữ.
    *   Triển khai Đội 1 (The Sentry) xây dựng lá chắn bảo mật dữ liệu cá nhân, tự động ẩn danh hóa và phục hồi thông tin nhạy cảm.
*   **Các thành phần kỹ thuật đã xây dựng**:
    1. **Đội 2 — The Librarian (Semantic Vector Search)**:
       * Tạo worker Python [librarian_embed.py](file:///d:/Nam-4/Build-app-web/WorkNote/server/python/librarian_embed.py): Sử dụng `transformers` và mô hình `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (chạy 100% offline nội bộ trên CPU). Áp dụng kỹ thuật Mean Pooling và chuẩn hóa $L_2$ để tính Cosine Similarity chính xác giữa câu hỏi và tài liệu.
       * Cập nhật [embedService.ts](file:///d:/Nam-4/Build-app-web/WorkNote/server/services/embedService.ts): Thêm hàm bất đồng bộ `searchSourcesSemantic` kết nối tiến trình con Node.js sang Python thông qua Stream nhị phân JSON stdin/stdout. Tích hợp cơ chế **Graceful Fallback**: nếu Python worker quá thời gian hoặc gặp sự cố, hệ thống tự động quay về thuật toán Bag-of-Words cũ mà không làm gián đoạn người dùng.
       * Cập nhật [notebook.ts](file:///d:/Nam-4/Build-app-web/WorkNote/server/routes/notebook.ts): Sử dụng `searchSourcesSemantic` trong endpoint `/api/notebook/chat` giúp câu trả lời NotebookLM trích xuất chính xác nguồn kiến thức ngay cả khi từ ngữ hỏi khác với từ ngữ trong tài liệu.
       * Tạo [embedServiceSemantic.test.ts](file:///d:/Nam-4/Build-app-web/WorkNote/server/tests/embedServiceSemantic.test.ts): Kiểm thử tự động khả năng phân hạng tài liệu theo ngữ nghĩa tiếng Việt.
    2. **Đội 1 — The Sentry (Bảo vệ dữ liệu cá nhân PII Guard)**:
       * Tạo service [piiGuardService.ts](file:///d:/Nam-4/Build-app-web/WorkNote/server/services/piiGuardService.ts): Hỗ trợ phát hiện và mã hóa ẩn danh hóa đa định dạng nhạy cảm (CCCD 12 số, CMND 9 số, Số điện thoại Việt Nam +84/09x/..., Email RFC 5322, Số tài khoản ngân hàng STK, API Keys sk-/AIza, Tên riêng sinh viên theo ngữ cảnh).
       * Cung cấp cơ chế **Reversible Vault**: Cho phép khôi phục nguyên trạng văn bản khi người dùng cần hiển thị lại (`unmaskPII`), trong khi nội dung chuyển giao cho các mô hình AI hoặc lưu trữ công cộng là dữ liệu vô danh tính.
       * Tạo router [privacy.ts](file:///d:/Nam-4/Build-app-web/WorkNote/server/routes/privacy.ts): Cung cấp 2 API endpoints `/api/privacy/anonymize` và `/api/privacy/restore`.
       * Gắn router vào [server.ts](file:///d:/Nam-4/Build-app-web/WorkNote/server.ts) tại `/api/privacy`.
       * Tạo [piiGuard.test.ts](file:///d:/Nam-4/Build-app-web/WorkNote/server/tests/piiGuard.test.ts): Kiểm thử 5 kịch bản bảo mật và tính toàn vẹn của dữ liệu sau giải mã.
    3. **Kiểm thử và xác minh chất lượng (Verification)**:
       * Toàn bộ 15 bài kiểm thử đơn vị (`npm test`) vượt qua 100% (`15/15 tests pass`, `tsc --noEmit` không có bất kỳ lỗi cú pháp nào).
*   **Bài học kỹ thuật**:
    * *Kiến trúc Hybrid Bridge Node.js - Python*: Giữ nguyên thế mạnh I/O bất đồng bộ chịu tải cao của Express, đồng thời tận dụng hệ sinh thái AI phong phú của PyTorch và Hugging Face mà không cần cài đặt thêm microservice phức tạp.
    * *Nguyên tắc Phòng thủ Chiều sâu (Defense in Depth)*: Bảo mật dữ liệu cá nhân phải có tính chất 2 lớp: lớp 1 lọc và ẩn danh (Đội 1 - Sentry), lớp 2 xử lý nội bộ không thoát dữ liệu ra mạng ngoài (Đội 2 - Librarian chạy local CPU).

---

## 7. Khảo sát Phần cứng Thực tế & Khởi động Chương trình Huấn luyện 3 Giờ Làm Chủ Hugging Face
*   **Kết quả khảo sát phần cứng thực tế của máy**:
    *   **CPU**: Intel Core i7-12650H thế hệ 12 (10 nhân, 16 luồng xử lý) — CPU cực mạnh, tối ưu xuất sắc cho các mô hình AI vừa và nhỏ.
    *   **RAM**: 16 GB tổng cộng (hiện tại đang **trống 8.1 GB RAM**).
    *   **Kết luận kỹ thuật**: Máy hoàn toàn đủ sức mạnh chạy cực kỳ mượt mà các mô hình từ `0.5B` đến `3B` tham số (như `Qwen2.5-0.5B`, `Qwen2.5-1.5B`, `Llama-3.2-1B`) mà không sợ giật lag hay treo máy.
*   **Thiết kế Lộ trình Huấn luyện Cấp tốc 3 Giờ (Fast-Track AI Engineer Training)**:
    *   *Giờ 1*: Giải mã quy luật cốt lõi (Quy tắc Vàng 3 bước: Tokenizer $\rightarrow$ Model $\rightarrow$ Inference) và chạy thử model LLM Chat đầu tiên.
    *   *Giờ 2*: Chinh phục mọi họ mô hình trên Hugging Face (Phân loại, Tóm tắt, Dịch thuật, Trích xuất thực thể).
    *   *Giờ 3*: Đóng gói thành API cho Web/App và làm chủ kỹ năng tự chọn + tự tích hợp bất kỳ model nào trên Hugging Face.

---

## 8. Trả lời Câu hỏi & Xác nhận Môi trường Ảo (Virtual Environment)
*   **Câu hỏi từ học viên**: "Mình đang dùng chạy cái ảo trên cái dự án này có được không?"
*   **Giải đáp & Bài học Kỹ thuật**: Hoàn toàn **ĐƯỢC** và cực kỳ **CHÍNH XÁC**. Việc tạo và sử dụng môi trường ảo (ví dụ: thư mục `.venv`) trực tiếp bên trong một dự án Node.js/React là tiêu chuẩn "vàng" (Best Practice) trong kiến trúc Hybrid (Lai ghép) giữa Web và AI.
    *   **Cách ly (Isolation)**: Các thư viện AI như PyTorch, Transformers rất lớn và phức tạp. `.venv` giúp nhốt tất cả chúng vào một cái "hộp" riêng. Nó không làm bẩn hệ điều hành Windows gốc của em, và cũng không ảnh hưởng đến các dự án khác trên máy.
    *   **Triển khai dễ dàng**: Mọi mã nguồn Python và Node.js nằm chung một thư mục. Khi muốn di chuyển hoặc sao lưu, chỉ cần bỏ qua các thư mục như `.venv` và `node_modules`, mang đi nơi khác chạy 1 lệnh là phục hồi lại đúng 100% môi trường cũ.

---

## 9. Hoàn thành Giờ 1 - Thử thách Pipeline Phân tích Cảm xúc (Sentiment Analysis)
*   **Hành động**: Học viên đã chạy thành công đoạn script `bai_tap_1.py` dùng Hugging Face `pipeline("sentiment-analysis")`.
*   **Kết quả đạt được**: 
    *   Mô hình trả về độ chính xác cực cao (POSITIVE ~99.98%, NEGATIVE ~99.96%).
    *   Học viên đã nắm được tư duy cốt lõi của thư viện `transformers`: Không cần code thuật toán Machine Learning (if/else), chỉ cần gọi đúng tên ống dẫn (`pipeline`) và truyền dữ liệu.
*   **Bước tiếp theo (Giờ 2)**: Chuyển sang mô hình Sinh văn bản (Text Generation) với ngôn ngữ Tiếng Việt (Qwen) để mô phỏng "Gia sư AI".

---

## 10. Hoàn thành Giờ 2 - Triệu hồi Local LLM (Text Generation với Qwen)
*   **Hành động**: Học viên đã chạy thành công đoạn script `bai_tap_2.py` dùng `pipeline("text-generation", model="Qwen/Qwen2.5-0.5B-Instruct")`.
*   **Kết quả đạt được**: 
    *   Mô hình đã sinh ra đoạn giải thích bằng tiếng Việt về AI: "AI là một ngành học nghiên cứu và phát triển...". 
    *   Học viên đã thấy được hiện tượng LLM lặp lại prompt ban đầu ở phần đầu câu trả lời (đây là đặc trưng của base text-generation khi chưa ép format chat template).
*   **Bài học Kỹ thuật**: Cách điều khiển LLM thông qua `max_new_tokens`.
*   **Bước tiếp theo (Giờ 3)**: Xử lý lỗi "lặp câu hỏi" bằng Chat Template, đóng gói thành API trong Node.js (ứng dụng thực tế).

---

## 11. Hoàn thành Giờ 3 - Làm chủ Chat Template & System Prompt (Tốt nghiệp)
*   **Hành động**: Học viên chạy thành công `bai_tap_3.py`, tích hợp cấu trúc tin nhắn (System/User) vào `pipeline` của mô hình Qwen.
*   **Kết quả đạt được**:
    *   Mô hình không còn lặp lại câu hỏi.
    *   Mô hình xuất ra câu trả lời gọn gàng, tự nhận diện là "trợ lý trí tuệ nhân tạo được tạo ra bởi Alibaba Cloud" do ảnh hưởng của Base Model alignment.
    *   Học viên đã học được cách trích xuất chính xác nội dung câu trả lời từ cấu trúc mảng từ điển (dictionary array) trả về của Hugging Face (`ket_qua[0]['generated_text'][-1]['content']`).
*   **Bài học Kỹ thuật**: Chat Template là yếu tố bắt buộc để mô phỏng một AI Assistant chuyên nghiệp. System Prompt đóng vai trò thiết lập nhân cách và quy tắc cho mô hình trước khi người dùng tương tác.
*   **Tình trạng**: Hoàn thành xuất sắc khóa huấn luyện cấp tốc 3 giờ. Học viên đã có đủ kiến thức nền tảng để tự đọc Docs của Hugging Face và áp dụng mọi mô hình (Tóm tắt, Dịch thuật, Phân loại...) vào kiến trúc Multi-Model của dự án WorkNote.

---

## 12. Giải mã sự khác nhau giữa AutoModel (Thủ công / Low-level) và Pipeline (Tự động / High-level)
*   **Câu hỏi từ học viên**: Phân tích đoạn code mẫu trên website Hugging Face sử dụng `AutoModelForCausalLM`, `AutoTokenizer`, `apply_chat_template`, `model.generate`, `batch_decode` thay vì `pipeline()`.
*   **Giải thích kỹ thuật**:
    *   `pipeline()` là chiếc "xe số tự động": Hugging Face gói gọn Tokenizer $\rightarrow$ Model $\rightarrow$ Generator $\rightarrow$ Decoder vào 1 dòng duy nhất.
    *   `AutoModel` + `AutoTokenizer` là chiếc "xe số sàn / mổ xẻ động cơ":
        1. **Tokenizer**: Dịch chữ thành mảng số (`input_ids`) dạng Tensor PyTorch.
        2. **apply_chat_template**: Định dạng prompt theo đúng chuẩn thẻ đặc biệt của mô hình (`<|im_start|>system...`).
        3. **model.generate**: Bật động cơ neural network sinh xác suất các token tiếp theo.
        4. **batch_decode**: Dịch chuỗi số ngược lại thành chữ người đọc được và lọc bỏ token điều khiển (`skip_special_tokens=True`).
*   **Giá trị**: Học viên đã nhìn thấu được cơ chế hoạt động thực sự bên dưới nắp ca-pô của mọi mô hình LLM trên thế giới.

---

## 13. Khắc phục lỗi Pre-commit Husky & Rà soát Bảo mật Git (.venv, tmp-spec-kitty)
*   **Vấn đề & Nhu cầu từ người dùng**:
    *   Cần kiểm tra trước khi commit và đẩy lên GitHub: lo ngại `.venv` và `tmp-spec-kitty` bị đẩy lên, lỗi thiếu package hoặc Husky chặn commit.
*   **Kết quả rà soát thực tế**:
    1. **Bảo mật `.gitignore`**:
       * `.gitignore` đã khai báo chính xác `node_modules/`, `.venv/`, `tmp-spec-kitty/`, `.env*`.
       * Lệnh `git status --ignored -s` xác nhận `.venv/` và `tmp-spec-kitty/` đều nằm ở trạng thái Ignored (`!!`). Không có bất kỳ file nào của `.venv` hay `tmp-spec-kitty` bị nằm trong vùng Staging (an toàn 100%).
    2. **Nguyên nhân gốc rễ Husky chặn commit**:
       * Trước đó cấu hình `.lintstagedrc.json` gọi `npm run lint` (`tsc --noEmit`).
       * Khi `lint-staged` chạy, nó tự động đính kèm danh sách các file đang staged vào đuôi lệnh (`tsc --noEmit src/...`).
       * Theo cơ chế của TypeScript Compiler (`tsc`), khi truyền đường dẫn file trực tiếp, `tsc` sẽ **hoàn toàn bỏ qua file cấu hình `tsconfig.json`**, dẫn đến việc thiếu cờ `--jsx react-jsx` và `esModuleInterop`, gây ra hàng loạt lỗi ảo (`error TS17004: Cannot use JSX...`) và chặn commit.
*   **Giải pháp đã xử lý**:
    *   Chuyển đổi sang `lint-staged.config.js` sử dụng cú pháp function `() => 'tsc --noEmit'`. Cú pháp này hướng dẫn `lint-staged` chạy kiểm tra toàn diện TypeScript theo đúng chuẩn `tsconfig.json` mà không truyền tham số file lẻ.
    *   Kiểm tra `npx lint-staged`: Tiến trình chạy mượt mà, exit code 0, toàn bộ 24 file `.ts/.tsx` đều vượt qua lint.
    *   Cập nhật vùng staging sẵn sàng cho lệnh `git commit`.
