# Giai đoạn 6 — CI và bàn giao GitHub

Phạm vi theo yêu cầu ngày **03/10/2026**: triển khai CI; CD chờ dự án hoàn thiện thêm.

## Kiểm tra tự động

Workflow [ci.yml](../.github/workflows/ci.yml) chạy khi:

- Push lên `main`, `dev`, `frontend`, `ci/**`.
- Pull request vào `main` hoặc `dev`.
- Chạy thủ công qua Actions khi workflow đã có trên default branch.

Các job: **Secret scan**, **Dependency audit**, **Lint, tests and build**, và **CI gate** tổng hợp. Job cuối vẫn chạy khi job khác thất bại và chỉ thành công khi mọi kiểm tra bắt buộc thành công.

| Hạng mục | Cách thực hiện |
| --- | --- |
| Cài đặt | Node 22.14.0, pnpm 9.15.9, `pnpm install --frozen-lockfile`; không fallback cài không frozen |
| Type/lint | Tách `typecheck` và ESLint flat config; kiểm tra React rules-of-hooks |
| Backend | Unit tests trong cwd tạm; không đọc `.env`, không tải model hoặc gửi cloud request |
| Frontend | Vitest/jsdom + Testing Library kiểm tra gắn nguồn, lỗi lưu, chưa chọn notebook |
| Production smoke | Khởi động bundle trên cổng tạm, AI tắt, notebook data tạm; kiểm tra built asset, status, validation và CRUD |
| Local AI | `test:integration` riêng, không giả định đã test model thật khi CI thông thường xanh |
| Secrets | Gitleaks v8.30.1, binary checksum cố định, quét lịch sử Git và redact log |
| Dependencies | Audit production; critical chặn CI; report retained 14 ngày, mức khác vẫn cần review |
| Quyền Actions | `contents: read`, checkout không lưu credential; PR dùng `pull_request` |
| Bảo trì | Actions pin SHA, Dependabot cho dependencies và Actions; PR template và CONTRIBUTING |

## Giới hạn cần hiểu

- Kiểm tra CI là tính đúng của các test hiện có, không phải chứng nhận sản phẩm sẵn sàng production.
- Dependency audit đã ghi nhận các advisory high ở dependency hiện có. Không nâng ngưỡng hoặc che report để mô tả sản phẩm “không còn lỗ hổng”; cần cập nhật/thay thế dependency trong bước bảo mật tiếp theo.
- FE suite là mốc đầu tiên, chưa bao phủ toàn bộ 8 tabs hay các luồng browser/media.
- Không có release artifact, deploy workflow, tài khoản hosting hoặc khóa triển khai trong bước này.
- Thiết lập branch protection phải được kiểm tra bằng GitHub API; file workflow riêng không tự bảo vệ nhánh.

## Cách sử dụng sau khi mở PR

Push commit mới lên nhánh PR để CI chạy lại. Mở tab **Checks**, xem job thất bại và log. Khi tất cả gate đạt và thay đổi đã được review, merge PR theo chính sách nhánh. CD được thiết kế ở một PR khác sau khi bạn chốt môi trường chạy.

Chi tiết lệnh local và commit convention: [CONTRIBUTING.md](../CONTRIBUTING.md).

## Bằng chứng thực thi ngày 03/10/2026

- [Draft PR #2](https://github.com/nguyenmaivy/WorkNote/pull/2), nhánh `ci/phase6-quality-gates`; chưa merge vào `main` vì dự án đang chỉnh sửa.
- [Lần chạy Actions đạt](https://github.com/nguyenmaivy/WorkNote/actions/runs/37113502698) tại commit `f99f9a27fd5da74c0e542ed975e764c50bc33e42`: cả 4 jobs thành công; frozen install, ESLint, TypeScript, **27 backend + 3 frontend tests**, build và production smoke đều đạt. Tab Checks của PR cung cấp kết quả mới nhất sau từng commit.
- Local Windows/Node 22.14.0/pnpm 9.15.9: lint/types, các test nói trên, build/smoke đạt; Gitleaks history và snapshot source không phát hiện secret.
- Audit production: **4 low, 21 moderate, 33 high, 0 critical**. `audit:ci` đọc JSON có kiểm tra schema, chặn critical; lỗi registry/report không hợp lệ làm CI thất bại. Có 3 unit tests kiểm tra chính sách này.
- Branch protection **chưa cấu hình**: chính sách PR/approval/admin bypass chờ chủ dự án chọn. CI có check `CI gate` nhưng chưa tự buộc main phải đạt check đó.

PR chứa snapshot các module ứng dụng đã được chỉnh sửa trước công việc CI để clean checkout có đủ các import và chạy được cùng phiên bản. Đây không phải phê duyệt toàn bộ refactor. Dữ liệu notebook cá nhân, upload, `.env`, model GGUF và môi trường Python cục bộ không được commit. CD không được cấu hình.
