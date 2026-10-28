# M2 — Smart note có nguồn

Ngày: **27/10/2026**. Trạng thái: **đã triển khai nền tảng và UI, tests mock PASS; chưa nghiệm thu local LLM thật**. M1 được người dùng chấp nhận chuyển giai đoạn cùng các giới hạn STT đã ghi, không có nghĩa mọi quality gate kỹ thuật đã đóng.

## Đã triển khai

- Contract note: summary, key points, decisions, action items, open questions; mỗi item có source_segment_ids. Action assignee/deadline bắt buộc string hoặc null; không thiếu trường.
- SQLite schema v2 thêm notes revision/watermark, migration giữ events/segments M1; transaction, watermark final cùng session, unique retry và cascade delete. Đã test close/reopen giữ note.
- Local-only LLM qua loopback, không redirect/cloud fallback. Input transcript là dữ liệu không tin cậy, yêu cầu không thực hiện chỉ dẫn trong transcript. Validate JSON, kích thước, source ID thuộc batch/ghi chú trước và item trùng trước lưu. Kiểm tra ID không chứng minh entailment nội dung: người dùng vẫn cần đọc nguồn.
- Batch tối đa 30 finals/3500 ký tự segment JSON; note tối đa 6000 ký tự JSON, tổng input tối đa 11000 ký tự, output 1200 tokens. Không cắt âm thầm segment lớn: báo lỗi context và giữ note/watermark cũ. Ngân sách ký tự chưa phải token count chính xác của model.
- Một note job tại một thời điểm, coalesce pending theo session (tối đa 32). Không gọi LLM từ audio callback/final persist. Bản đầu **hoãn note đến sau Stop**; yêu cầu khi recording hiển thị pending. Worker close tự yêu cầu note (trừ môi trường unit test). Khi note job đang chạy, API start capture từ chối rõ ràng thay vì giả định abort HTTP có thể dừng inference native.
- Chưa có live smart note trong lúc recording, full-session second-pass consolidation, priority với Q&A hoặc job scheduler chung toàn app. Các module chat khác vẫn có thể gửi request local LLM; không tuyên bố một job toàn ứng dụng.
- API GET/POST `/api/meeting/sessions/:id/note` đi sau middleware loopback/token/Host/Origin. Delete hủy pending/job và không tạo lại session đã xóa. GET trả last good note + status/error.
- UI Smart note dưới transcript: yêu cầu cập nhật/retry, polling 3s không chồng các GET, bỏ response session cũ, revision/watermark và nguồn dạng details có timestamp/raw text. Hiển thị cảnh báo STT và last-good khi lỗi. Chưa gộp note vào Markdown export M1.
- Python local server forward `response_format: {type: 'json_object'}` chỉ khi client yêu cầu đúng giá trị; chat cũ không có trường này giữ nguyên. Server đang chạy cần restart có kiểm soát để nhận code mới; chưa dừng server người dùng.

## Kiểm chứng

- `corepack pnpm run check`: **PASS**, lint/typecheck, **46 backend tests**, **22 frontend tests**, build, production smoke. Smoke production hiện không nghiệm thu M2 LLM.
- Tests M2: schema/source/duplicate/null, hoãn recording, coalesce/idempotency, lỗi giữ note/final, tuần tự jobs/delete, storage reopen, HTTP note auth và UI sources/error/session-switch.
- Local model smoke trong SQLite memory với transcript tổng hợp: lần 1 timeout 45s; lần 2 timeout 120s/output 1200 trả **Incomplete local LLM output**, không lưu note. Sau đó bổ sung JSON mode server/client; **chưa chạy được smoke bản JSON mode** vì auto-mode classifier chặn lệnh isolated server. Không ghi nhận model thật PASS.
- `scripts/smoke-meeting-note.mts --isolated-server`: script kiểm chứng server tạm cổng 11435, tự cleanup child, cần đặt LOCAL_LLM_BASE_URL tương ứng; chưa thực thi thành công. Không tải model, không dùng DB thật.
- `scripts/test_local_llm_json.py`: test AST mock forward JSON mode không tải model/bind port; đã viết nhưng chưa chạy vì tool bị chặn. Node quality gates không bao gồm Python test này.

## Cách dùng bản hiện tại

Sau khi backend/UI và local LLM đã restart có kiểm soát: vào Meeting, chọn phiên có final, dùng **Tạo / cập nhật note**. Phiên cũ cần yêu cầu thủ công; đang ghi thì pending đến Stop. Mở **Nguồn** để đọc bằng chứng. Khi lỗi JSON/timeout, note tốt gần nhất vẫn còn và có thể retry; không tự sửa transcript.

## Gate còn lại

1. Chạy Python JSON forwarding test, smoke JSON mode với local model thật; chỉnh schema/prompt/ngân sách theo output thực, không nới validation để biến lỗi thành PASS.
2. Browser E2E note generation/source/reload/error trên phiên thử; kiểm tra migration v1→v2 trên DB fixture và batch dài/timeout/restart.
3. Đánh giá nội dung có nguồn với tên/số/phủ định/deadline thay đổi; note không được chắc chắn hơn STT.
4. Sau khi baseline after-stop ổn, mới cân nhắc note trong lúc ghi với load/backlog đo thực. Queue pending hiện ở memory: backend restart mất yêu cầu đang chờ, note đã lưu giữ nguyên; dùng nút cập nhật để tiếp tục.
