# WorkNote: Kế hoạch hoàn thiện 6 giai đoạn

> **Kế hoạch review trước đây.** Quy định triển khai và trạng thái trong tài liệu này thuộc mốc lập kế hoạch; phần biên tập tài liệu 03/10/2026 đã được chủ dự án yêu cầu. Việc cần làm hiện tại: [roadmap portfolio](future_roadmap.md).

**Trạng thái:** Bản dự thảo để review, chưa phải yêu cầu triển khai đã chốt  
**Ngày rà soát repo:** 2026-09-28; cập nhật quyết định theo phản hồi ngày 2026-09-30  
**Mục đích:** Thống nhất phạm vi và tiêu chí trước khi thay đổi mã nguồn.

> Trạng thái vẫn là tài liệu review. Chưa cài package, xóa file, refactor hay sửa cấu hình runtime. Chỉ bắt đầu code sau khi chủ dự án review bản cập nhật và xác nhận duyệt.

## Tóm tắt hiện trạng

| Giai đoạn | Có sẵn | Còn thiếu / cần xác minh |
|---|---|---|
| 1. Business Idea | `project_docs/prd.md` có vấn đề, persona, mục tiêu và KPI; phạm vi sản phẩm và mục tiêu upload 2 GiB cho media Gemini đã được phản hồi | Chưa có mô hình chi phí AI theo kịch bản; một số KPI chưa có cách đo; quota theo user/ngày và giới hạn chi phí chưa chốt |
| 2. Low-code & Contract | Có giao diện, `kitty-specs/`, test cases và một số schema Gemini hiện có | Chưa thấy bộ user flow/state machine được duyệt; chưa có runtime contract Zod thống nhất; phân biệt rõ prototype UI hiện tại với wireframe dùng để chốt yêu cầu |
| 3. PRD / BA | Có PRD nhiều module, spec NotebookLM và checklist kiểm thử | Thiếu acceptance criteria Gherkin nhất quán, quy tắc fallback AI/timeout, DoD và chủ sở hữu nguồn sự thật; tài liệu có thể lệch code hiện tại |
| 4. POC Verification | App React/Express chạy được; đã có test backend và tài liệu walkthrough | Cần baseline đo được, smoke test theo luồng và đối chiếu tài liệu với code; không coi việc “build được” là xác nhận chất lượng production |
| 5. Decoupling | Có component, hooks, services, routes và một số module được tách | Một số component UI/game vẫn lớn; chưa có Controller layer đồng đều; render game canvas gắn với lifecycle/state React |
| 6. GitHub Delivery | Có pnpm scripts, CI lint/test/build, Husky + lint-staged và lịch sử merge PR | ESLint/Vitest/PR template/Contributing chưa thấy; kiểm tra secret cần được bổ sung; cần xác nhận review/branch protection trên GitHub |

### Quan sát repo tại thời điểm rà soát

- Package manager và lockfile chính là **pnpm** (`pnpm-lock.yaml`); scripts hiện có `lint` (TypeScript), `test` (lint + `tsx --test`) và `build`.
- `.github/workflows/ci.yml` đã chạy lint, test và build. Vì vậy mục tiêu là hoàn thiện/nâng chất CI hiện có, không dựng CI từ đầu.
- Chưa thấy ESLint, Vitest, Zod hoặc Testing Library được khai báo trong `package.json` tại lần kiểm tra này.
- Có 9 file `*.bak` dưới `src/`; `.gitignore` hiện chưa có quy tắc `*.bak`. Tài liệu này **không yêu cầu xóa ngay**: cần phân biệt file backup đang được Git theo dõi hay là thay đổi/nguyên liệu người dùng trước khi quyết định.
- Kích thước một số component được kiểm tra bằng byte: `GameFarmLobby.tsx` 138,781; `StudentBudgetTracker.tsx` 80,452; `AudioSpeechLab.tsx` 57,625; `DocUploadSection.tsx` 41,369; `ChatbotSection.tsx` 36,740. Đây là tín hiệu để lập kế hoạch, không phải tiêu chí tách tự động chỉ dựa trên kích thước.
- Phản hồi sản phẩm chọn mục tiêu hỗ trợ media tới 2 GiB qua Gemini Files API khi loại file/provider cho phép. Hiện `server/config.ts` mặc định `MAX_FILE_SIZE_MB=200`; các route multipart dùng giới hạn này, còn JSON body parser cũng giới hạn 200 MB. Chưa đồng bộ PRD, giới hạn theo loại file/link, dung lượng đĩa, proxy và concurrency. Không tăng giới hạn chung lên 2 GiB nếu chưa thiết kế backpressure và kiểm thử tài nguyên.
- `server.ts` áp limiter chung 150 request/phút và heavy-AI 10 request/5 phút. `server/services/rateLimitTracker.ts` hiện cooldown sau lỗi provider (mặc định 60 giây, dài hơn sau nhiều lỗi), không phải bộ đếm chủ động RPM/RPD/audio-seconds. Các ngưỡng free do người dùng cung cấp là giả định gần đúng, cần cấu hình bảo thủ và xác minh theo model/tài khoản/region.
- Fallback OpenRouter hiện có vòng lặp qua `OPENROUTER_MODELS` trong `server/services/llmOrchestrator.ts` và `server/services/providerRouter.ts`; vì vậy chính sách tối đa một fallback request chưa được bảo đảm. Cần hợp nhất chính sách timeout/call budget và limiter provider trong thiết kế triển khai.
- `project_docs/walkthrough.md` mô tả Gemini Files API tới 2 GiB, Groq cho audio nhỏ (tối đa 24 MB theo luồng hiện tại), fallback LLM Gemini → OpenRouter; đây là mô tả walkthrough, không thay thế kiểm chứng runtime và quota.
- Tại lúc rà soát, working tree có nhiều thay đổi và file chưa được Git theo dõi; nhánh `main` đang ahead `origin/main` một commit. Mọi bước sau phải bảo toàn nguyên trạng các thay đổi này, không dọn/xóa/ghi đè nếu chưa được xác nhận.

## Nguyên tắc triển khai

1. Ưu tiên độ tin cậy, khả năng kiểm thử và luồng học tập cốt lõi; không xóa tính năng vệ tinh trong đợt “feature freeze”.
2. Đo baseline trước refactor; sau mỗi lát thay đổi chạy kiểm tra hẹp trước, rồi mới chạy bộ kiểm thử rộng.
3. Refactor theo lát dọc nhỏ, giữ tương thích API/UI và tránh đại tu cùng lúc frontend, backend, game, AI và toolchain.
4. Hợp đồng dữ liệu là runtime validation ở ranh giới tin cậy. TypeScript type đơn thuần không xác thực JSON do model/API trả về.
5. Mọi giới hạn chi phí, quota, timeout, dung lượng upload và concurrency phải có cấu hình, kiểm thử và thông báo lỗi rõ ràng.
6. Không xóa backup hay file chưa rõ nguồn gốc; xác định trạng thái Git và có phương án khôi phục trước khi dọn.

## Lộ trình đề xuất

### Giai đoạn 1: Business Idea & AI Economics

**Mục tiêu:** Chốt đối tượng, lợi ích, Core MVP và các ràng buộc chi phí trước khi mở rộng tính năng.

**Việc cần làm**

- Phạm vi được phản hồi: NotebookLM, Chatbot, Mindmap, Audio Lab, Knowledge Base và Budget đều phải hoàn thành; Game là hạng mục phụ, ưu tiên sau.
- Viết bảng In-scope / Out-of-scope, giả định, rủi ro và tiêu chí thành công có cách đo, nguồn dữ liệu và thời hạn.
- Lập mô hình AI economics theo kịch bản người dùng/tháng: số lần upload/chat, input/output tokens, model/provider, giá tại thời điểm tính, chi phí STT/vision và tỷ lệ fallback.
- Tách giới hạn kích thước file khỏi quota gọi AI: mục tiêu media tới 2 GiB qua Gemini Files API khi provider và loại file hỗ trợ; không buộc file lớn đi qua Base64/JSON.
- Thiết kế quota/circuit cho từng provider và capability. Ngưỡng lập kế hoạch ban đầu theo phản hồi: Gemini Free khoảng 15 RPM/1.500 RPD; Groq Free khoảng 20–30 RPM và vài nghìn audio-seconds/ngày; OpenRouter Free không có SLA ổn định và chịu tải cộng đồng. Đây là giá trị gần đúng, phải cấu hình được, xác minh theo model/tài khoản/region và không xem là cam kết của nhà cung cấp.
- Có giới hạn riêng theo user/ngày và chính sách khi hết quota; giới hạn provider phải dùng bộ đếm/queue chủ động theo RPM, RPD và audio-seconds thay vì chỉ đợi 429 rồi cooldown. Với nhiều instance, bộ đếm cần dùng storage chia sẻ.
- Định nghĩa backpressure cho upload 2 GiB: multipart streaming-to-disk, kiểm tra dung lượng trống, concurrency/queue, cleanup khi lỗi/hủy, giới hạn thời gian theo pipeline và thông báo 413/429/503 rõ ràng. Chốt riêng loại file, URL/link, proxy và giới hạn lưu trữ trước khi nâng cấu hình hiện tại 200 MB.
- Không hard-code chi phí trước khi chọn model, giá và chính sách quota.

**Đầu ra / cổng duyệt**

- Core MVP và ma trận In/Out được chủ dự án duyệt.
- Bảng unit economics ghi rõ giả định/công thức, không coi giá model là hằng số bất biến.
- Danh sách KPI có baseline, mục tiêu, cách thu thập và người chịu trách nhiệm.

### Giai đoạn 2: Low-code, User Flows & Data Contracts

**Mục tiêu:** Chốt luồng, trạng thái và payload trước khi thay đổi các ranh giới API.

**Việc cần làm**

- Vẽ flow người dùng: Upload → Extract/OCR/STT → Summary/Mindmap/Quiz → xem kết quả/ôn tập; thêm nhánh lỗi, retry, hủy, demo và thiếu provider.
- Định nghĩa state machine file: `idle`, `uploading`, `processing`, `ready`, `error`, `cancelled` (tên trạng thái cuối cùng cần khớp model hiện tại); ghi rõ sự kiện chuyển trạng thái và hành động UI/API.
- Ghi business rules cho upload size theo capability, quota provider/user, hàng đợi và concurrency (hiện Gemini/upload queue tối đa 3), timeout, retry/fallback, cleanup file tạm và PII masking. Kích thước file không được dùng thay cho quota request; một file lớn vẫn phải chịu quota/concurrency của các tác vụ OCR, STT và LLM phát sinh.
- Định nghĩa Zod schemas cho Analysis response (`summary`, `extractedText`, `quiz`, `mindmap`), API request/response và lỗi; dùng `safeParse` ở biên backend/model, chuẩn hóa lỗi và không tin JSON của model chỉ vì có Gemini response schema.
- Chọn cách chia sẻ contract giữa Vite frontend và Express backend trước khi cài Zod; xác minh TypeScript/esbuild có thể build cả hai phía từ một module dùng chung.
- Duy trì Gemini `responseSchema` nếu phù hợp, nhưng xem đó là ràng buộc generation, không thay thế bước validate runtime.

**Đầu ra / cổng duyệt**

- Sơ đồ user flow, state machine và bảng business rules.
- Contract có ví dụ payload hợp lệ/không hợp lệ, hành vi khi parse lỗi và test cases.
- Không triển khai schema trước khi field bắt buộc/optional và chính sách repair/fallback được thống nhất.

### Giai đoạn 3: PRD chuẩn hóa (BA role)

**Mục tiêu:** Biến yêu cầu đã duyệt thành nguồn sự thật có thể kiểm thử.

**Việc cần làm**

- Chọn một tài liệu PRD chuẩn cho sản phẩm; `project_docs/prd.md` là ứng viên hiện có. Các spec feature trong `kitty-specs/` dẫn chiếu về PRD, không chép lại yêu cầu gốc gây lệch.
- Viết user stories và acceptance criteria Gherkin cho Core MVP; gắn ID để liên kết requirement → test case → PR/implementation.
- Viết ma trận provider/capability: Groq ưu tiên STT audio phù hợp giới hạn hiện hành (luồng đang chọn Groq cho file audio ≤24 MB); Gemini Files xử lý media lớn và vision/OCR; OpenRouter chỉ fallback cho tác vụ text/schema tương thích. Nội dung học đã mask PII được phép gửi OpenRouter khi Gemini lỗi; không gửi vision/audio sang provider không hỗ trợ capability đó.
- Chốt lỗi/retry: LLM 30 giây cho từng provider request; Gemini 429 không retry và chuyển thẳng OpenRouter nếu capability/schema phù hợp; Gemini 503 retry tối đa một lần sau 1 giây rồi fallback; OpenRouter fallback tối đa một request, không retry tiếp. Gemini Files polling ACTIVE tối đa 60 giây; STT và OCR/PDF scan có timeout riêng, baseline 60–120 giây và hiệu chỉnh theo telemetry; toàn pipeline xử lý file không bị hard deadline 30 giây.
- Khi timeout phải hủy request nếu SDK hỗ trợ; không chỉ race Promise khiến request nền tiếp tục chạy. Retry/fallback phải tính vào limiter của provider đích và có idempotency phù hợp.
- Định nghĩa DoD theo module: acceptance tests, typecheck, lint, security checks, accessibility/responsive smoke test, docs và CI xanh.

**Đầu ra / cổng duyệt**

- Gherkin bao phủ luồng thành công, lỗi, biên và fallback cho các tính năng trong MVP.
- Ma trận traceability từ PRD tới test.
- DoD và chính sách fallback được duyệt trước khi refactor các API liên quan.

### Giai đoạn 4: POC Verification & Baseline Audit

**Mục tiêu:** Đóng băng mở rộng tính năng và đo hiện trạng trước tối ưu/refactor.

**Việc cần làm**

- Feature freeze có phạm vi: không thêm feature mới; vẫn cho phép sửa lỗi, security, độ tin cậy và việc cần để đo/kiểm thử.
- Kiểm kê file backup/test/demo, Git tracked/untracked/ignored, import/reference và khả năng khôi phục. Chỉ đề xuất xóa từng nhóm sau khi chủ dự án duyệt; thêm ignore rule không thay thế việc xem xét file đã tracked.
- Chụp baseline: frontend bundle (tổng và chunk lớn), Lighthouse trên build production, API latency theo endpoint và provider, memory/RSS khi xử lý file mẫu. Ghi máy, browser, file, API key/provider, số lần lặp và p50/p95 để so sánh công bằng.
- Tách thời gian xử lý nội bộ khỏi thời gian provider; không chạy benchmark AI có tính phí nếu chưa xác nhận quota/chi phí.
- Chạy smoke test cho NotebookLM, Chatbot, Mindmap, Audio Lab, Knowledge Base và Budget trên build local; Game được kiểm tra sau như hạng mục phụ. Ghi Pass/Fail/Blocked; không tuyên bố đã đạt nếu thiếu credentials hoặc dữ liệu kiểm thử.

**Đầu ra / cổng duyệt**

- Baseline có thể tái lập và danh sách lỗi/nợ kỹ thuật được ưu tiên.
- Danh mục file cần giữ/xóa được review; không xóa `.bak` trong bước lập baseline.
- Mốc đo và tiêu chí hồi quy/performance được thống nhất trước modularization.

### Giai đoạn 5: Decoupling & Modularization

**Mục tiêu:** Giảm coupling từng phần, không thực hiện một đợt rewrite lớn.

**Frontend, theo thứ tự đề xuất**

1. Tách `App.tsx` thành app shell/layout, navigation và component điều phối tab; giữ `App.tsx` làm composition root, không thêm router mới nếu kiến trúc tab hiện tại đáp ứng nhu cầu.
2. Tách `DocUploadSection` theo upload/link input, file list/card và progress/error presentation; chuyển request/state orchestration vào hooks/services sau khi xác định rõ ownership.
3. Tách `ChatbotSection` theo message list, composer, context picker và session persistence; giữ hành vi bàn phím/a11y và lưu trữ hiện có.
4. Tách game theo các ranh giới kiểm chứng được: domain/state machine, maze/world logic, asset loader, canvas renderer/game loop, input/audio manager và React UI. Dùng `requestAnimationFrame` ổn định; tránh `setState` mỗi frame nếu không cần render React.
5. Tách Audio/Budget khi baseline hoặc test chỉ ra lợi ích; không bắt buộc tách mọi component lớn chỉ vì số byte.

**Backend, theo thứ tự đề xuất**

1. Chuẩn hóa route → controller/handler → service cho các route Core MVP; không chuyển tất cả endpoint cùng lúc.
2. Đặt controller chỉ làm HTTP mapping/validation; nghiệp vụ và provider orchestration nằm trong services; giữ types/contracts rõ ràng.
3. Chuẩn hóa wrapper IPC Node ↔ Python: executable/path, timeout, giới hạn stdout/stderr/payload, xử lý exit/error, cancellation nếu hỗ trợ, schema input/output và fallback có log không lộ dữ liệu nhạy cảm.
4. Giữ cấu hình server hiện tại tại `server/config.ts`; chỉ tạo shared config/constants khi có nhiều consumer thực sự và không đưa secret vào bundle client.

**Quy tắc refactor**

- Mỗi pull request giới hạn một module/luồng; thêm hoặc cập nhật test trước/sát với thay đổi.
- So sánh baseline sau mỗi module; rollback khi có regression chức năng, latency, memory hoặc accessibility.
- Tránh đổi API và refactor kiến trúc trong cùng PR trừ khi contract là mục tiêu của PR.

### Giai đoạn 6: GitHub Delivery & Quality Gates

**Mục tiêu:** Chuẩn hóa kiểm tra tự động và cách bàn giao qua PR.

**Việc cần làm**

- Mở rộng CI hiện có: cài dependency bằng `pnpm install --frozen-lockfile` (không fallback sang cài không frozen trong CI), typecheck/lint, test, build; thêm job frontend test và kiểm tra secret/dependency phù hợp.
- Chọn ESLint config tương thích TypeScript/React hiện tại; thêm format/lint chỉ sau khi thống nhất quy tắc và chạy thử để tránh sửa hàng loạt không cần thiết.
- Chọn Vitest + Testing Library cho FE nếu phù hợp với Vite; thiết lập một smoke/unit test nhỏ đầu tiên trước khi migrate hoặc viết nhiều test. Giữ `node:test` hiện có cho backend, trừ khi có quyết định thống nhất chuyển đổi.
- Bổ sung secret scanning: không in hoặc commit secret; kiểm tra secret ở CI/pre-commit bằng tool chuyên dụng hoặc rule đã đánh giá false positive. Hook local là tiện ích, không phải ranh giới bảo mật duy nhất.
- Thêm PR template (mục tiêu, phạm vi, test, rủi ro, ảnh UI nếu cần), commit convention và `CONTRIBUTING.md`/hướng dẫn đóng góp.
- Quy trình nhánh đã phản hồi: `frontend` / `dev` → kiểm tra và review → `main`; xác minh branch protection/quyền GitHub trước khi cấu hình. Không tạo branch, commit, push hay mở PR trong giai đoạn review tài liệu.
- Không tự commit, push, tạo branch hay mở PR trong giai đoạn chuẩn bị tài liệu.

**Đầu ra / cổng duyệt**

- CI chạy lặp lại ổn định trên pull request và main.
- PR checklist, quy ước commit và hướng dẫn chạy local thống nhất với pnpm/scripts thật.
- Branch protection/review policy được xác nhận trên GitHub, không chỉ mô tả trong tài liệu.

## Thứ tự thực hiện sau khi duyệt

1. Duyệt phạm vi MVP, chính sách file tới 2 GiB theo capability, và mô hình quota/backpressure ở Giai đoạn 1.
2. Hoàn thiện flow, state machine, provider/capability matrix, business rules và Zod contract cho pipeline tài liệu ở Giai đoạn 2.
3. Cập nhật PRD/Gherkin/DoD, lập traceability ở Giai đoạn 3.
4. Chụp baseline và review danh mục file; giữ nguyên các thay đổi chưa commit ở working tree.
5. Refactor một lát Core MVP mỗi lần, chạy test/CI sau từng lát.
6. Bổ sung FE test/lint/secret scanning và quy trình PR dựa trên trạng thái CI hiện có.

## Quyết định đã phản hồi và mục còn mở

### Quyết định hiện tại

- Phạm vi hoàn thành: NotebookLM, Chatbot, Mindmap, Audio Lab, Knowledge Base và Budget; Game là hạng mục phụ.
- Mục tiêu upload media tới 2 GiB qua Gemini Files API khi capability và giới hạn provider cho phép. Cần thiết kế giới hạn theo loại file, link, lưu trữ và concurrency; hiện cấu hình runtime vẫn là 200 MB.
- Ngưỡng rate limit Gemini/Groq nêu ở trên chỉ là ước lượng cho gói free. Triển khai cần configurable provider quotas và theo dõi 429/latency; OpenRouter free không được xem là provider có thời gian đáp ứng ổn định.
- Cho phép gửi nội dung học đã mask PII sang OpenRouter khi Gemini lỗi, chỉ khi capability, schema và chính sách dữ liệu tương thích.
- Retry/fallback và timeout theo quy tắc tại Giai đoạn 3; giới hạn 30 giây áp dụng cho từng LLM provider request, không áp dụng cho toàn pipeline file.
- Giữ nguyên các file `.bak` trong giai đoạn review; chỉ xem xét ignore sau khi kiểm tra Git tracked status. Không xóa.
- Quy trình nhánh: `frontend` / `dev` → kiểm tra, review → `main`. Chưa tự cấu hình branch protection nếu chưa xác minh quyền.
- Quy trình phê duyệt: tài liệu → chủ dự án review/phản hồi → chỉnh sửa tài liệu → chủ dự án duyệt → mới bắt đầu code.

### Còn cần chốt trước khi triển khai

1. AI budget/quota áp dụng theo user nào, chu kỳ nào, và có trần chi phí USD/VND hay không.
2. Xác nhận nhóm file/link được phép tới 2 GiB và giới hạn tài nguyên triển khai (disk quota, số upload đồng thời, proxy/request timeout); không được suy ra rằng mọi loại file/provider đều nhận 2 GiB.
3. Xác minh quota thực tế theo API key, model và region; chọn mức cấu hình bảo thủ ban đầu cùng hành vi khi queue/quota đầy.
4. Chủ dự án review bản kế hoạch này và xác nhận duyệt. Cho tới lúc đó, chỉ tiếp tục sửa tài liệu theo phản hồi; không sửa runtime, cài package, xóa file, tạo branch, commit hay push.