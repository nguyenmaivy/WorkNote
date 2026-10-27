# M1 — Meeting session và transcript bền vững

Ngày: **22/10/2026**. Trạng thái: **đang triển khai/kiểm chứng**, chưa nghiệm thu gate 60 phút.

## Phạm vi

- Meeting là workspace trung tâm: **Ghi họp local / Hội thoại online / Văn bản & TTS**, không còn Audio Lab riêng trên sidebar. Các mục online không thuộc pipeline M1 local và không tự nhận transcript local.
- Một nguồn mic hoặc system audio trên Windows; Sherpa Việt int8 local, cửa sổ khoảng 5 giây, không phải native streaming.
- Final transcript và cảnh báo gap được lưu SQLite trước khi replay đến UI. Không lưu file audio, không gọi cloud/LLM, không tự tải model.
- Chỉ truy cập Meeting qua localhost; không chia sẻ token truy cập local. Transcript nằm trên đĩa máy, chưa mã hóa ở cấp ứng dụng: tài khoản có quyền đọc thư mục dữ liệu vẫn đọc được nội dung.

## Chuẩn bị và sử dụng

1. Dùng Node **22.14.x–22.x** theo `package.json`; SQLite tích hợp `node:sqlite` hiện còn phát cảnh báo experimental trên Node 22.14.
2. Dùng env M0 `.venv-meeting-m0` có PyAudioWPatch, sherpa-onnx, NumPy; worker dùng Python 3.10 baseline. Không dùng nhầm `.venv` local LLM. Model có sẵn tại `models/stt/sherpa-vi-int8-20250420`; không phân phối lại model khi license ONNX chưa được làm rõ.
3. Chạy `corepack pnpm run dev`, mở `http://localhost:3000`, vào Meeting. Chọn đúng mic/system và thiết bị, xác nhận consent của người tham gia rồi mới Start.
4. Stop để flush đoạn cuối. Có thể mở lại phiên, reconnect hoặc export Markdown. Gap/lỗi phải được đọc cùng transcript, không coi nội dung bị thiếu là im lặng chắc chắn.
5. Xóa phiên đã dừng bằng Delete và xác nhận. File Markdown đã tải về là bản riêng, cần tự xóa nếu không muốn giữ. Không có tự động xóa theo retention trong M1.

## Kiểm chứng

- Baseline trước tích hợp: `python -I scripts/test_meeting_m0.py`: **16 tests PASS** (0.890 giây), fake capture, không ghi âm thật.
- Baseline trước tích hợp: `corepack pnpm run test:unit`: **exit 0**.
- `node:sqlite`: tạo/mở DB in-memory thành công; SQLite **3.47.2**, Node **v22.14.0**.
- Sau tích hợp: `corepack pnpm run typecheck`: **PASS**.
- Sau tích hợp: `corepack pnpm run test:unit`: **exit 0**, gồm tests store/contract meeting; chưa có đủ supervisor lifecycle tests.
- `corepack pnpm exec vitest run src/components/MeetingWorkspace.test.tsx`: **3 tests PASS**.
- `.venv-meeting-m0/Scripts/python.exe -I scripts/test_meeting_worker.py`: **5 tests PASS**, fake lifecycle/timeline; chưa chứng minh capture phần cứng.
- Env M0 Python **3.10.0** import được audioop, sherpa_onnx, NumPy, PyAudioWPatch. `audioop` không có trong Python 3.13: dùng đúng baseline, chưa hỗ trợ nâng Python tùy ý.
- Sau hợp nhất hub: lint + typecheck **PASS**; frontend **15 tests / 4 files PASS**, backend unit **29 tests PASS**, build và production smoke **PASS**. Lint ban đầu quét nhầm worktree cũ và thất bại; đã exclude `.claude/worktrees/**`/env M0 và sửa 2 lỗi lint trong code mới, chạy lại tuần tự thành công.
- Browser thật: mở Meeting và chuyển qua cả 3 mục thành công; screenshot `artifacts/meeting-hub.png` đã xem. Lần đầu sau HMR snapshot trắng; reload rồi kiểm tra lại thành công. Không bật mic, không gửi dịch/TTS cloud. Production smoke hiện kiểm tra app/notebook, không thay test end-to-end capture Meeting.
- Hub tests: 4 cases navigation/status fail-closed/mode lock; online tests: 5 cases consent/Stop/unmount/late response/error. Tổng 12 cases liên quan gồm 3 local UI. Các test mock chưa bao phủ đầy đủ TTS PCM và API/WS/supervisor lifecycle/security.
- **M1 chưa hoàn tất nghiệm thu, chưa nên dùng làm bản ghi duy nhất cho cuộc họp thật**. Lỗi safety classifier đã gián đoạn một số bước trước; chỉ các lệnh nêu kết quả ở đây được ghi nhận PASS.

## Bổ sung kiểm chứng — 26/10/2026

- Sửa supervisor: final `text_raw` được lưu SQLite đồng bộ, nguyên văn từ worker trước khi đọc frame tiếp theo. Không chờ formatter/local LLM và không chuẩn hóa tên/số ngay trên raw. Vì vậy UI/export mới hiển thị raw thay vì bản đã khôi phục dấu câu; dữ liệu cũ không bị sửa. Regression test bao gồm final và lỗi worker trong cùng một batch stdout, không bỏ final đã nhận trước lỗi.
- Xử lý lỗi stdin/EPIPE của worker thành gap/error bền vững thay vì để lỗi stream không được xử lý làm crash backend.
- Thêm 7 supervisor tests: raw-before-crash, stop flush tail, stop khi starting/late ready, thiếu stopped marker, lỗi command stream, sai source, readiness/stop timeout.
- Thêm test SQLite trên file tạm thật: close/reopen giữ raw, retry không nhân đôi, conflict bị từ chối, backend restart đánh dấu gap/error đúng một lần; không dùng DB của người dùng.
- Thêm HTTP/WebSocket transport test trên loopback: token, Host/Origin, cursor, replay 1.201 event theo đúng sequence không trùng, cách ly session, export giữ gap/error và delete không ảnh hưởng session khác. Đây là dữ liệu tổng hợp, không phải phiên ghi 60 phút.
- Thêm UI test: worker error bỏ trạng thái ghi và partial, hiện gap/error, cho export.
- `corepack pnpm run check`: **PASS** — lint, typecheck, **42 backend tests**, **19 frontend tests**, build, production smoke. Build còn cảnh báo bundle >500 kB; smoke vẫn không thay thế capture E2E. Test Host lần đầu dùng fetch bị client bỏ/ghi đè header và trả 200; đổi sang Node HTTP request để gửi Host thực, chạy lại toàn bộ PASS.
- Thêm Python fake overflow test (gap/error và đóng stream), nhưng **chưa chạy lại bộ Python**: công cụ PowerShell bị auto-mode safety classifier chặn với thông báo `Highest[1m] is temporarily unavailable`. Không ghi nhận Python PASS cho lần thay đổi này. Không sửa worker Python runtime trong đợt này.
- **Chưa nghiệm thu M1**: vẫn cần thu thật 60 phút, đo RAM/backlog/coverage và thử mất thiết bị/restart trên baseline sau khi người dùng xác nhận thu âm. Các kiểm tra tự động trên không thay thế bằng chứng phần cứng.

## Phiên system audio do người dùng kiểm thử — 27/10/2026

- Người dùng báo đã ghi/lưu phiên khoảng 60 phút ổn định, nhưng tiếng Anh bị phiên âm và tiếng Việt còn thiếu/sai nội dung. Export local: `artifacts/meeting-m1/test-60p-system-meeting.md`, created `2026-10-26T16:51:28.500Z`, source `system`; final cuối kết thúc tại **3.651.700 ms (~60 phút 51,7 giây)**. Đây là bằng chứng phiên dài có transcript/export, chưa phải số đo RAM/backlog hay kiểm chứng độ chính xác.
- Export có **4 cảnh báo `capture_timeline_gap`**: 650375–741750 ms (**91,375 giây**), 2296970–2297155 ms (0,185 giây), 2300115–2300234 ms (0,119 giây), 2565654–2572780 ms (**7,126 giây**); tổng **98,805 giây**. Chưa biết đây là nguồn system idle/pause hay mất capture khi nguồn vẫn có tiếng; không coi mọi gap là mất lời, cũng không coi là đã đạt coverage.
- Chất lượng: export có các chuỗi như `ANDROPIC OBEN A IP MI`, `BỘ FAN`, `ABAL`. Không tự sửa/đoán lại raw khi chưa có audio/reference. Nội dung cắt theo cửa sổ ~5 giây; ảnh hưởng cắt từ/ngữ cảnh cần đối chiếu audio, chưa kết luận nguyên nhân duy nhất.
- Trạng thái: **đã có user smoke system audio >60 phút; gate M1 chưa đóng toàn bộ**. Cần xác minh hai gap dài có trùng lúc nguồn dừng phát không, chất lượng trên đoạn audio/reference đại diện, RAM/backlog và các tình huống lifecycle phần cứng còn lại.

## Benchmark nguồn và replay — 27/10/2026

- Python worker fake tests chạy lại: **13 tests PASS**; hết chặn thực thi sau khi người dùng đổi quyền. Các log overflow/decoder error trong test là tình huống kiểm thử chủ động.
- Đã so cùng audio YouTube `csHNhew6nN4` (~482,65s): Sherpa 5s/15s có mức bất đồng token với TXT 12,17%/10,24%; Whisper base 5s/15s 30,66%/26,56%. TXT chưa hiệu đính nên không gọi đây là tỷ lệ lỗi chuẩn.
- Replay production Python worker có preview, 180s mỗi engine, tuần tự: cả hai exit 0, queue capture peak 2, không overflow/gap/error. Sherpa final-age P95 0,094s, RAM đỉnh lấy mẫu ~249 MiB; Whisper P95 2,005s, ~583 MiB. Không gồm WASAPI/backend/UI/concurrent LLM và không thay nghiệm thu toàn pipeline.
- 35 final Sherpa replay khớp text/timestamp hoàn toàn với baseline offline cùng biên cắt. Thử dịch biên cửa sổ 5s có ảnh hưởng nhỏ (bất đồng token 11,73–12,17%), chưa đủ xác định đây là nguyên nhân duy nhất của thiếu từ trong capture thật.
- Giữ engine/default 5s, không tự sửa raw hay xóa câu lặp. Chưa tìm được bản sửa runtime được dữ liệu chứng minh khắc phục đầy đủ vấn đề chất lượng. Chi tiết và kết quả tại [đối chiếu chất lượng](meeting_m1_quality_comparison.md), `artifacts/meeting-m1/comparison-csHNhew6nN4-20261027-01/`.

## Nghiệm thu phần cứng còn lại

Chỉ chạy sau khi người dùng xác nhận sẵn sàng và cho phép thu âm:

- Mic/system đúng output thực tế; im lặng → có tiếng; câu ngắn và câu lặp thật.
- Stop khi starting/recording, flush đoạn cuối, restart; rút/mất thiết bị.
- Worker chết/backend restart: không giữ trạng thái recording giả, có error/gap bền vững.
- Reconnect khi đang có final: không mất/nhân đôi; export giữ cảnh báo gap.
- Ghi thật **60 phút** trên baseline, đo RAM/backlog và kiểm tra coverage transcript.

M0 vẫn chưa đóng quality review có reference, tải STT cùng LLM đủ dài và license bản ONNX. M1 không bao gồm smart note, Q&A, mindmap, TTS, multi-source, đa ngôn ngữ hoặc đóng gói phân phối.
