# Đóng góp cho WorkNote

## Môi trường cố định

Dùng Node.js **22.14.0** và pnpm **9.15.9** (đã khai báo trong `package.json`).

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm run check
```

Nếu dùng pnpm trực tiếp, kiểm tra `pnpm --version` trước. Không chạy npm install trong checkout dùng pnpm; thay đổi dependencies bằng `pnpm add`/`pnpm remove` và commit manifest cùng `pnpm-lock.yaml`.

## Các kiểm tra

| Lệnh | Vai trò |
| --- | --- |
| `pnpm run lint` | ESLint cho JavaScript/TypeScript và quy tắc React hooks |
| `pnpm run typecheck` | Kiểm tra kiểu TypeScript |
| `pnpm run test:unit` | Backend `node:test`, chạy trong thư mục tạm, không đọc `.env`/dữ liệu thật |
| `pnpm run test:frontend` | Vitest + Testing Library, thao tác đính kèm nguồn thành công/thất bại |
| `pnpm run build` | Build frontend và server |
| `pnpm run test:smoke` | Chạy bundle production trên cổng tạm với AI tắt, kiểm tra HTML/asset/API/CRUD |
| `pnpm run check` | Toàn bộ kiểm tra thông thường ở trên |
| `pnpm run test:integration` | Tutor/semantic tests cần Python/model; chạy riêng ở máy đã setup |

CI thường không tải model GGUF và không yêu cầu API key. Nếu thay đổi local AI, ghi kết quả integration trong PR; unit test/mock không thay thế xác nhận model thật.

ESLint khởi đầu với recommended rules và kiểm tra rules-of-hooks. Các điểm `any` và biến chưa dùng từ mã hiện có được giữ ngoài gate ban đầu để tránh một đợt refactor toàn dự án; không gọi đây là kiểm chứng an toàn kiểu đầy đủ tại biên API.

## Nhánh và PR

Phát triển ở `dev`, `frontend` hoặc nhánh tính năng; mở PR về `main`. Nhánh `ci/**` cũng chạy CI khi push. Dùng PR template để mô tả vấn đề, hành vi mới, kiểm thử và rủi ro. Các PR chưa hoàn thiện để ở trạng thái draft.

Commit theo dạng `type: mô tả`, ví dụ `ci: add isolated quality checks`, `fix: preserve notebook source attachment`, `docs: update local setup`. Một commit nên có một mục tiêu rõ ràng. CI không tự merge hoặc tự deploy.

## Khóa và dữ liệu riêng

Giữ API keys trong `.env` đã ignore; chỉ commit `.env.example` với giá trị trống. Không đưa upload, model, `.venv`, thư viện cài đặt hoặc dữ liệu notebook cá nhân lên Git. Kiểm tra danh sách staged trước khi commit:

```powershell
git diff --cached --stat
# Nếu đã cài Gitleaks:
gitleaks git --redact --no-banner .
```

GitHub CI chạy Gitleaks với dữ liệu phát hiện được che trong log. Nếu có secret thật trong lịch sử Git, phải thu hồi/đổi key và xử lý lịch sử; không thêm allowlist chỉ để CI xanh.

## Dependency audit và CD

CI audit dependencies production; **critical** làm job thất bại. Mức high/moderate/low vẫn nằm trong report đính kèm ở Actions và cần được xử lý theo roadmap bảo mật. Gate đạt không đồng nghĩa dependency không còn lỗ hổng. Registry lỗi hoặc audit không chạy được cũng làm job thất bại.

Giai đoạn này chỉ triển khai CI. CD, đóng gói release và hosting được thực hiện sau khi phạm vi triển khai được chốt.
