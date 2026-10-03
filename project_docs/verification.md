# Báo cáo kiểm chứng — 03/10/2026

Mục đích: ghi rõ README và bộ ảnh dựa trên điều gì. Kiểm tra trên checkout hiện tại có sẵn dependencies và model; **chưa chạy clean install trên máy mới, chưa deploy public**.

## Cập nhật sau khi triển khai CI

[Giai đoạn 6](phase6_ci.md) đã xác minh frozen install trên GitHub runner sạch, lint/types, 27 backend + 3 frontend tests, build và production smoke. Bộ 29 tests có AI trong báo cáo phía dưới thuộc phiên demo trước đó. Lockfile npm đã bỏ, pnpm 9.15.9 được cố định, unit/integration được tách riêng. Git object thiếu đã khôi phục bằng refetch; đọc diff và commit/push đã hoạt động. Các giới hạn AI/UI/bảo mật còn lại vẫn cần xử lý.

## Môi trường phiên demo trước CI

| Thành phần | Ghi nhận |
| --- | --- |
| Hệ điều hành / shell | Windows / PowerShell |
| Node / npm | `v22.14.0` / `11.13.0` |
| App development | `npm run dev`, `http://localhost:3000` |
| App production smoke | `NODE_ENV=production`, `PORT=3001`, `npm start` |
| Local model | `worknote-qwen2.5-1.5b`, GGUF Q4_K_M có sẵn |
| Local runtime | `/v1/models`, CPU, context 8192, 8 threads, GPU layers 0 theo log khởi động |
| Chụp ảnh | Playwright Chromium, browser profile mới, 1600 × 1000 |
| Nguồn demo | [react-study-note.txt](examples/react-study-note.txt) |

Phiên app dùng `ALLOW_CLOUD_LLM_FALLBACK=false`. Chat và mindmap trả về nhãn local trong response. Điều này không chứng minh mọi chức năng ứng dụng đều offline; khóa/cấu hình riêng trong `.env` không được đưa vào tài liệu.

## Kết quả

| Kiểm tra | Kết quả | Phạm vi |
| --- | --- | --- |
| TypeScript | **Pass** | `npm test` gọi `npm run lint` → `tsc --noEmit` |
| Backend tests | **29 pass, 0 fail, 0 skipped** | 7 suites + các test Tutor, tổng khoảng 17,8 giây trong lần chạy |
| Build | **Pass**, có cảnh báo | Vite frontend + esbuild server bundle |
| Development startup | **Pass** | Express/Vite cổng 3000; WebSocket routes được mount; local model log Ready |
| Production startup | **Pass** | `npm start` với production env; `/api/status` HTTP 200 trên cổng 3001 |
| Notebook qua UI | **Pass luồng kỹ thuật** | Tạo → đổi tên → upload TXT → đính kèm → gửi câu hỏi → nhận HTTP 200 và phản hồi local |
| Mindmap qua UI | **Pass luồng, chưa đạt chất lượng nội dung** | Chọn notebook → generate HTTP 200 → render cây; cây quá chung chung |
| Ảnh giao diện | **7 PNG** | Library, nguồn Notebook, chat, mindmap, Farm lobby, Spending, Classic Quiz |
| Browser JS errors trong lần capture hoàn tất | **1 lỗi được ghi nhận** | `Getting rbox of element "g" is not possible` ở luồng chuyển tab liên quan editor SVG; ảnh vẫn được tạo, cần điều tra lifecycle mindmap |
| API cloud, OCR, media, URL | **Chưa kiểm chứng** | Không thực hiện end-to-end các luồng này |
| Clean install, CI remote, tải lớn, nhiều user, mobile | **Chưa kiểm chứng** | Không suy ra thành công từ unit tests/build |

Phản hồi API và danh sách ảnh nằm trong [capture-report.json](screenshots/capture-report.json). Báo cáo này lưu response thật của dữ liệu mẫu; UUID chỉ nhận diện bản ghi tạm đã được script dọn sau chụp.

## Những phát hiện ảnh hưởng mức sẵn sàng của dự án

1. **Embedding fallback:** test log có `ModuleNotFoundError: No module named 'torch'`; service chuyển sang Bag-of-Words. Test semantic ranking vẫn pass nhờ fallback, chưa xác nhận neural embedding.
2. **Bundle lớn:** `dist/assets/index-CtTHJQVq.js` khoảng 1.472,26 kB, gzip 428,93 kB; Vite cảnh báo chunk vượt 500 kB. Tên hash/kích thước có thể đổi ở lần build khác.
3. **Lockfile lệch:** so sánh dependencies/devDependencies ở package root trong `package-lock.json` với `package.json` đều không khớp. CI dùng pnpm, có fallback bỏ frozen install và chưa setup model/Python cho Tutor.
4. **Trạng thái provider là cấu hình:** `/api/status` không thực sự kiểm tra model/khóa/quota; thông báo “có AI” không bảo đảm request thành công.
5. **Upload chưa thống nhất:** UI Library ghi 200MB; `MAX_FILE_SIZE_BYTES` hiện theo trần media 2 GiB. Route process-file kiểm tra tài liệu 20 MiB nhưng loại trừ ảnh/media; route notebook dùng trần chung. Không thể mô tả toàn app đơn giản là giới hạn 50MB.
6. **Chất lượng AI:** một lần thử câu hỏi so sánh props/state đã có diễn giải sai về props và cập nhật giao diện. Lần chụp cuối dùng câu hỏi hẹp về state/useState và nhận câu trả lời đúng theo nguồn. Mindmap local trả nhánh “Ý chính/Ý phụ”; không coi HTTP 200 là nghiệm thu chất lượng.
7. **Trạng thái mindmap mới:** khi mở editor có thể hiện cây mặc định và nút “Tạo lại” trước khi sinh AI. Script chấp nhận cả nhãn “Tạo sơ đồ” và “Tạo lại”; cần kiểm tra việc cây mặc định phát sinh update/lưu trước khi gọi AI.
8. **Giới hạn nhiều người dùng:** notebook JSON store chung chưa có middleware auth/ownership; Firebase client init không thay thế kiểm tra quyền trên server.
9. **Lỗi SVG khi chuyển tab:** `pageErrors` ghi nhận `Getting rbox of element "g" is not possible`. Capture đã hoàn tất nhưng không phải một phiên trình duyệt không lỗi; cần kiểm tra việc đo layout/callback sau khi editor bị tháo khỏi DOM.
10. **Giới hạn rà diff:** `git diff --stat -- README.md project_docs` thất bại với `fatal: unable to read 15d65fb12f413b1c49cbc35139fb4e6c54cf23ea`. Chưa xác định nguyên nhân hoặc sửa object store; `git status` và đọc file trực tiếp vẫn được. Cần kiểm tra tính toàn vẹn repository trước khi giao mã nguồn.

## Phân biệt test và bằng chứng

- Test mindmap dùng stub generator; không đo chất lượng model thực.
- Test local endpoint trong multiProvider có mock; nhãn local thật được xác nhận thêm bằng chat trong browser và response capture.
- Test Tutor gọi runtime/model, có thể thất bại trên máy mới thiếu setup; không giả định `npm test` chạy được hoàn toàn offline ngay sau clone.
- Ảnh RPG/Spending xác nhận giao diện mẫu hiển thị, không xác nhận multiplayer, correctness tài chính hoặc mọi thao tác lưu dữ liệu.
- Bộ ảnh không sử dụng dữ liệu cá nhân; notebook và source do script tạo đã được dọn qua API sau khi chạy.
- Đã kiểm tra 18 Markdown files ở README/project_docs: không có liên kết file tương đối bị thiếu. PNG được xem trực tiếp; report ghi rõ lỗi trình duyệt thay vì coi capture hoàn tất là không lỗi.

## Tái kiểm tra

```powershell
corepack pnpm run check
corepack pnpm run test:integration
# Terminal khác: corepack pnpm run dev, chờ local model Ready
node project_docs/capture-demo.mjs
```

Đọc điều kiện store trống và cài Chromium tại [hướng dẫn](user_guide.md#8-tái-tạo-bộ-ảnh). Các bước tiếp theo có tiêu chí hoàn thành trong [roadmap](future_roadmap.md).
