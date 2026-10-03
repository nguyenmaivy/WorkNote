# WorkNote — VietLearn AI Lab

[![CI](https://github.com/nguyenmaivy/WorkNote/actions/workflows/ci.yml/badge.svg?branch=ci%2Fphase6-quality-gates)](https://github.com/nguyenmaivy/WorkNote/actions/workflows/ci.yml)

**Biến tài liệu học tập thành không gian hỏi đáp, sơ đồ tư duy và ôn tập tương tác.**

WorkNote là dự án web full-stack hướng đến sinh viên cần đọc, hệ thống hóa và ôn tập kiến thức từ tài liệu của mình. Người dùng có thể tải tài liệu, tập hợp nguồn trong notebook, hỏi AI theo nội dung đã đính kèm và tạo sơ đồ tư duy. Quiz và trò chơi 2D bổ sung một cách ôn tập trực quan.

Dự án kết hợp **React + TypeScript**, **Express** và **Python local LLM**, ưu tiên xử lý văn bản bằng model cục bộ và cho phép dùng API cloud khi được cấu hình. Tên hiển thị trong giao diện hiện là **VietLearn AI Lab**; tên dự án và thư mục là **WorkNote**.

> **Trạng thái:** bản phát triển phục vụ học tập và portfolio, đã chạy thử tại máy local. Chưa công bố demo trực tuyến hoặc xác nhận sẵn sàng phục vụ nhiều người dùng. CI ngày **03/10/2026**: lint/types đạt, **30/30 tests đạt**, build và production smoke đạt trên GitHub runner sạch. Xem [giai đoạn 6](project_docs/phase6_ci.md) và [phiên demo local AI](project_docs/verification.md).

![NotebookLM: hỏi đáp từ tài liệu mẫu bằng model local](project_docs/screenshots/03-notebook-chat.png)

*Ảnh chụp ứng dụng đang chạy với tài liệu React mẫu; phản hồi thực tế từ Qwen local, không phải ảnh thiết kế hay phản hồi dựng sẵn.*

[Chạy dự án](#chạy-dự-án) · [Hướng dẫn bằng ảnh](project_docs/user_guide.md) · [Kiến trúc](project_docs/architecture.md) · [Roadmap](project_docs/future_roadmap.md) · [Tài liệu](project_docs/README.md)

## Bài toán và luồng sử dụng

Tài liệu thường nằm rải rác trong PDF, ghi chú và bài giảng. WorkNote đưa các bước đọc, hỏi và ôn tập vào cùng một giao diện:

1. **Đưa tài liệu vào hệ thống:** dùng Library để phân tích một file, hoặc NotebookLM để tập hợp nhiều nguồn.
2. **Hỏi dựa trên nguồn:** đính kèm tài liệu vào notebook rồi đặt câu hỏi, yêu cầu tóm tắt hoặc giải thích.
3. **Hệ thống hóa:** mở Mind Maps, chọn Library hoặc NotebookLM và tạo sơ đồ từ nội dung đó.
4. **Ôn tập:** dùng quiz từ tài liệu đang chọn trong Library; khi chưa có quiz, trò chơi dùng bộ câu hỏi mẫu.

Library và NotebookLM hiện quản lý nguồn riêng; tải file vào Library **không tự đính kèm** file đó vào notebook.

## Tính năng hiện tại

| Phân hệ | Chức năng đã có trong mã nguồn | Điều kiện / giới hạn |
| --- | --- | --- |
| **Library** | Upload, trích xuất văn bản, phân tích tóm tắt/quiz/mindmap | Kết quả phụ thuộc model; ảnh, PDF scan và media cần provider phù hợp |
| **NotebookLM** | Tạo notebook, upload hoặc thêm URL, gắn nguồn, chat và hiển thị nguồn liên quan | Đã thử upload TXT → gắn nguồn → hỏi đáp local; đây là module của WorkNote, không kết nối dịch vụ Google NotebookLM |
| **Mind Maps** | Chọn tài liệu hoặc notebook, tạo và chỉnh sửa cây kiến thức | Cần nguồn và LLM; có ảnh trong hướng dẫn |
| **RPG Games** | Farm lobby, RPG Quest và Classic Quiz | Có câu hỏi mẫu; chưa kiểm chứng multiplayer hoặc đo hiệu quả học tập |
| **AI Chatbot** | Chat với ngữ cảnh tài liệu đang chọn | Tùy cấu hình; không phải mọi nhánh AI đều chạy local |
| **Audio / Video Lab** | Phiên âm, phụ đề, dịch và đọc văn bản | Cần mạng/provider tương ứng; chưa kiểm chứng media trong phiên tài liệu này |
| **Knowledge / Spending** | Kiến thức tĩnh, giao dịch và mục tiêu tiết kiệm | Tiện ích bổ sung; chi tiêu lưu tại trình duyệt |

## Điểm kỹ thuật để đánh giá dự án

- **Tổ chức full-stack:** frontend tách components, hooks và API services; backend tách routes, services và controller upload.
- **Tích hợp AI có phương án dự phòng:** router chọn local → OpenRouter → Gemini cho chat/tóm tắt/quiz đi qua router; OCR và speech dùng luồng riêng.
- **Quản lý tài nguyên:** Multer ghi file tạm xuống đĩa, giới hạn tần suất API, hàng đợi và giới hạn đồng thời cho tác vụ AI. Các cơ chế này giảm áp lực, không bảo đảm hết lỗi quota.
- **Kết nối Node/Python:** supervisor quản lý endpoint local tương thích OpenAI; Tutor có đường gọi local và worker Python dự phòng.
- **Lưu trữ và kiểm thử:** IndexedDB cho Library, JSON file cho notebook; tests cho CRUD, tìm kiếm, PII, chuẩn hóa đầu ra, mindmap và Tutor. `corepack pnpm run typecheck` kiểm tra kiểu; `corepack pnpm run lint` chạy ESLint từ giai đoạn 6.

Xem [kiến trúc và các đánh đổi](project_docs/architecture.md) để đi từ tính năng đến file mã nguồn liên quan.

## Chạy dự án

### 1. Chuẩn bị và cài dependencies

- **Node.js 22.14.0** và **pnpm 9.15.9**. CI dùng Node `22.14.0`, pnpm `9.15.9`; không dùng hướng dẫn Node 18 cũ vì dependency PDF yêu cầu Node mới hơn.
- **Python 3.10** nếu chạy model local; không cần Python khi chỉ xem giao diện hoặc dùng cloud text.
- Model GGUF cần tải khoảng **1,1 GB**; dành thêm dung lượng cho `.venv` và dependencies. Chưa đo yêu cầu RAM tối thiểu trong phiên này.

Tại thư mục mã nguồn vừa clone hoặc giải nén:

```powershell
cd D:\Lamviec\Build-app-web\WorkNote
corepack pnpm install --frozen-lockfile
```

Thay đường dẫn bằng thư mục của bạn. Giai đoạn 6 dùng duy nhất `pnpm-lock.yaml`, cố định package manager trong `package.json`; CI cài bằng `--frozen-lockfile` và không tự sửa lockfile. Hướng dẫn đóng góp và kiểm tra: [CONTRIBUTING.md](CONTRIBUTING.md).

### 2. Tạo `.env` ở thư mục gốc

Chọn một cấu hình dưới đây. Nếu đã có `.env`, sửa các dòng tương ứng và giữ lại giá trị riêng của bạn. [.env.example](.env.example) là danh sách tham khảo; các chuỗi `MY_...` / `your-...` là placeholder, không phải khóa sử dụng được.

**A. Xem giao diện, không cần API key hoặc model**

```dotenv
PORT=3000
NODE_ENV=development
LOCAL_LLM_ENABLED=false
LOCAL_LLM_AUTOSTART=false
ALLOW_CLOUD_LLM_FALLBACK=false
GEMINI_API_KEY=
OPENROUTER_API_KEY=
GROQ_API_KEY=
```

Library/Notebook có phản hồi demo ở các luồng hỗ trợ. Knowledge, Spending và quiz mẫu có thể dùng thử. **Demo không phân tích tài liệu thật**, và không phải endpoint nào cũng có demo fallback.

**B. Hỏi đáp văn bản bằng model local**

```dotenv
PORT=3000
NODE_ENV=development
LOCAL_LLM_ENABLED=true
LOCAL_LLM_AUTOSTART=true
LOCAL_LLM_BASE_URL=http://127.0.0.1:11434/v1
LOCAL_LLM_MODEL=worknote-qwen2.5-1.5b
LOCAL_LLM_MODEL_PATH=models/qwen2.5-1.5b-instruct-q4_k_m.gguf
LOCAL_LLM_CONTEXT_SIZE=8192
LOCAL_LLM_THREADS=8
LOCAL_LLM_GPU_LAYERS=0
LOCAL_LLM_TIMEOUT_MS=45000
ALLOW_CLOUD_LLM_FALLBACK=false
GEMINI_API_KEY=
OPENROUTER_API_KEY=
GROQ_API_KEY=
```

Cài runtime và tải model một lần:

```powershell
python scripts/setup_local_llm.py
```

Script tạo `.venv`, cài [requirements-local-llm.txt](requirements-local-llm.txt) và tải GGUF vào `models/`. Backend tự khởi động model khi chạy app. Lần cài đầu cần Internet; model và `.venv` không nằm trong Git. Nếu dùng endpoint local riêng, tắt `LOCAL_LLM_AUTOSTART` và chỉnh base URL/model tương ứng.

`ALLOW_CLOUD_LLM_FALLBACK=false` chỉ giới hạn các tác vụ text được router áp dụng; **không phải công tắc offline toàn ứng dụng**. Dịch, TTS, OCR và STT có đường gọi mạng riêng. Ảnh trong README được chụp với chat dùng local và cloud fallback tắt.

**C. Chạy text bằng cloud, không tải model local**

```dotenv
PORT=3000
NODE_ENV=development
LOCAL_LLM_ENABLED=false
LOCAL_LLM_AUTOSTART=false
ALLOW_CLOUD_LLM_FALLBACK=true
GEMINI_API_KEY=
OPENROUTER_API_KEY=
GROQ_API_KEY=
```

Điền khóa thật vào `GEMINI_API_KEY` hoặc `OPENROUTER_API_KEY` cho text. Gemini dùng cho OCR/ảnh; Groq hoặc Gemini dùng cho các luồng phiên âm được hỗ trợ. Giữ khóa trống nếu không sử dụng. Model/quota phụ thuộc tài khoản và cấu hình; repo không cam kết cloud miễn phí hoặc luôn khả dụng. Firebase là tùy chọn, không cần cho demo trên.

### 3. Khởi động và kiểm tra

```powershell
corepack pnpm run dev
```

Mở **http://localhost:3000**. Một tiến trình Express phục vụ cả API và Vite; không cần mở thêm frontend ở cổng 5173.

Ở terminal thứ hai:

```powershell
Invoke-RestMethod http://localhost:3000/api/status
# Chỉ khi dùng local LLM:
Invoke-RestMethod http://127.0.0.1:11434/v1/models
```

`/api/status` phản ánh cấu hình provider, chưa xác minh khóa hợp lệ hoặc model đã nạp xong. Với local, chờ log `Ready at ...` và kiểm tra `/v1/models` trước khi gửi câu hỏi.

Thử ngay: **NotebookLM → Tạo notebook → Tải tài liệu lên → chọn [react-study-note.txt](project_docs/examples/react-study-note.txt) → + Đính kèm vào trang → nhập câu hỏi → Gửi.** Xem [hướng dẫn từng bước](project_docs/user_guide.md).

### 4. Build và chạy production tại máy local

```powershell
corepack pnpm run build
$env:NODE_ENV = "production"
corepack pnpm start
```

Trên macOS/Linux:

```bash
corepack pnpm run build
NODE_ENV=production corepack pnpm start
```

Build tạo frontend trong `dist/` và server tại `dist/server.cjs`. Server vẫn cần `node_modules`, `.env` và Python/model nếu bật local AI. Chỉ chạy `corepack pnpm start` mà không đặt `NODE_ENV=production` sẽ đi vào nhánh Vite development.

Dừng bằng `Ctrl+C`. Khi quay lại development trong cùng cửa sổ PowerShell, đặt `$env:NODE_ENV = "development"` rồi chạy `corepack pnpm run dev`. Chạy từ thư mục gốc để server tìm đúng model, Python scripts và dữ liệu notebook.

### 5. Kiểm tra chất lượng

```powershell
corepack pnpm run check
# Chỉ khi máy đã có Python/model:
corepack pnpm run test:integration
```

`corepack pnpm run check` chạy ESLint, TypeScript, backend unit tests, FE interaction tests, build và production smoke. Tutor/semantic tests được tách sang `test:integration`; máy chạy CI thông thường không cần Python/model hoặc API keys. Tìm kiếm có thể fallback nên integration pass cũng cần đối chiếu log để xác nhận neural embedding.

## Hướng dẫn nhanh bằng ảnh

| Bước | Thao tác | Ảnh |
| --- | --- | --- |
| 1 | Tải TXT và đính kèm vào notebook | [Nguồn tài liệu](project_docs/screenshots/02-notebook-sources.png) |
| 2 | Đặt câu hỏi, xem phản hồi và nhãn model | [Hỏi đáp local](project_docs/screenshots/03-notebook-chat.png) |
| 3 | Mind Maps → nguồn NotebookLM → tạo sơ đồ | [Sơ đồ tư duy](project_docs/screenshots/04-mindmaps.png) |
| 4 | RPG Games → Classic Quiz | [Quiz mẫu](project_docs/screenshots/07-classic-quiz.png) |

## Dữ liệu và giới hạn

- **Library:** IndexedDB trong trình duyệt. **Notebook:** `data/notebook.json` trên server; lịch sử chat ở localStorage. Xóa dữ liệu trình duyệt hoặc đổi origin ảnh hưởng dữ liệu phía client.
- Chưa có xác thực và kiểm tra quyền sở hữu notebook ở API; hồ sơ UI chưa phải tài khoản đăng nhập. Chưa phù hợp để mở server chung chứa dữ liệu riêng của nhiều người.
- Store JSON, limiter và lobby gắn với tiến trình. Chưa xác minh nhiều instance; không áp dụng hướng dẫn PM2 cluster từ tài liệu cũ.
- Giới hạn upload giữa UI và các route chưa thống nhất. Nên thử TXT nhỏ trước; chưa kiểm chứng media 2 GiB hoặc tài liệu lớn.
- Model nhỏ có thể trả lời sai; cần đối chiếu nguồn. PII guard không bảo đảm che mọi dữ liệu cá nhân trong mọi luồng.
- Chưa có benchmark tải, đánh giá độ chính xác AI hoặc đo mức tiết kiệm chi phí.

Roadmap ưu tiên **cài đặt lặp lại được → kiểm thử luồng chính → chất lượng trả lời → auth và dữ liệu**. Xem [công việc kèm tiêu chí hoàn thành](project_docs/future_roadmap.md).

## Cấu trúc mã nguồn

```text
WorkNote/
├── src/                   # React UI, hooks, client services, types
├── server.ts              # Express, Vite/static, routes, WebSocket
├── server/
│   ├── routes/            # HTTP API
│   ├── controllers/       # Controller xử lý file
│   ├── services/          # AI routing, parsing, storage, PII
│   ├── python/            # Local LLM, embedding workers
│   ├── tests/             # Node test runner + TypeScript
│   └── websockets/        # Audio translation, game lobby
├── scripts/               # Cài runtime/model local
├── models/                # GGUF tải riêng, không commit
├── project_docs/          # PRD, kiến trúc, hướng dẫn, ảnh, roadmap
└── kitty-specs/            # Đặc tả NotebookLM theo work package
```

## Xử lý lỗi thường gặp

| Hiện tượng | Cách kiểm tra |
| --- | --- |
| `EADDRINUSE` cổng 3000 | Dừng app cũ hoặc đổi `PORT`; mở URL đúng cổng |
| Local thiếu model / không kết nối | Chạy setup, kiểm tra GGUF và `/v1/models`; chờ model nạp xong |
| Có AI nhưng request thất bại | Kiểm tra endpoint, khóa, quota; `/api/status` chỉ phản ánh cấu hình |
| Câu trả lời là Demo | Bật và kiểm tra local hoặc cấu hình cloud provider |
| `No module named torch` | Embedding fallback theo từ khóa; cài GGUF không đồng nghĩa đã có neural embedding |
| Notebook không bám tài liệu | Kiểm tra nguồn đã **đính kèm**, nội dung trích xuất và khả năng model |
| HTTP 429 | Chờ rate limit hoặc kiểm tra quota provider; limiter không loại bỏ được 429 |
| Vite cảnh báo chunk lớn | Build vẫn thành công; tách bundle theo tab nằm trong roadmap |

## Tài liệu chi tiết

- [Mục lục và trạng thái tài liệu](project_docs/README.md)
- [Hướng dẫn sử dụng bằng ảnh](project_docs/user_guide.md)
- [Kiến trúc và quyết định kỹ thuật](project_docs/architecture.md)
- [Yêu cầu sản phẩm](project_docs/prd.md)
- [Bằng chứng chạy thử](project_docs/verification.md)
- [Lộ trình hoàn thiện portfolio](project_docs/future_roadmap.md)

## CI trên GitHub

[Workflow CI](https://github.com/nguyenmaivy/WorkNote/actions/workflows/ci.yml) kiểm tra secret, dependency audit, lint/types, tests và production build/smoke. Xem [giai đoạn 6](project_docs/phase6_ci.md) và [CONTRIBUTING](CONTRIBUTING.md). Giai đoạn hiện tại chỉ CI; CD triển khai sau. Dependency audit chặn critical, các advisory mức khác vẫn được giữ trong report để xử lý.

CI đang hoạt động trên nhánh `ci/phase6-quality-gates` trong [draft PR #2](https://github.com/nguyenmaivy/WorkNote/pull/2). Bản source/tài liệu này chưa merge vào `main`; để chạy đúng phiên bản, checkout nhánh đó trước khi cài dependencies. Badge hiện trỏ đến nhánh CI; chuyển badge về `main` sau khi merge.
