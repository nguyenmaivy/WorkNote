# WorkNote — Kế hoạch Local-first Meeting Copilot

Ngày lập: **11/10/2026**.
Cập nhật: **22/10/2026**. Trạng thái: **M0 đã benchmark, người dùng chốt Sherpa Việt int8 cho MVP tiếng Việt; chưa đóng toàn bộ Gate M0. M1 đang triển khai và kiểm chứng, chưa nghiệm thu gate 60 phút**. Xem [kết quả M1](meeting_m1_results.md).

## Cập nhật điều hướng — 22/10/2026

Theo lựa chọn người dùng, **Meeting làm trung tâm** với Ghi họp local / Hội thoại online / Văn bản & TTS; bỏ Audio Lab riêng. Giữ dịch live online bằng mic trình duyệt + Google, không trộn engine với Sherpa hoặc tự đưa transcript local ra cloud. Local active/unknown khóa audio online; online audio đang chạy khóa đổi mode trong workspace. Dữ liệu SQLite và roadmap M0–M4 giữ nguyên; các mục online không đồng nghĩa M1 đã có dịch local/TTS offline. Bộ recorder ngắn trùng lặp và controls giả được bỏ. Chi tiết yêu cầu/tests tại [PRD](prd.md), [test cases](test_cases.md), [kết quả M1](meeting_m1_results.md). VAD/endpointing là đề xuất tiếp theo theo [khảo sát RTranslator](rtranslator_reference.md), chưa tự đánh số lại M2–M4.

## 1. Kết luận và phạm vi

`phuc-nt/my-translator` hữu ích nhất như tài liệu tham khảo cho native audio capture, cách nối audio với AI worker và UX transcript. Không nên fork toàn bộ ứng dụng hoặc coi repo này là giải pháp STT/TTS local sẵn có cho Windows.

Mục tiêu WorkNote:

```text
Mic hoặc system audio
→ STT tiếng Việt đã benchmark
→ Live transcript + final segments được lưu bền vững
→ Smart note theo batch
→ Q&A trên final transcript, có nguồn tham chiếu
→ Mindmap từ note
→ TTS on-demand, ưu tiên sau khi dừng ghi
```

MVP ưu tiên **Windows**, UI hiện có, một nguồn audio mỗi lần và **Sherpa Việt int8 qua sherpa-onnx cho tiếng Việt**, đã được người dùng chốt ngày 16/10/2026. Checkpoint: `models/stt/sherpa-vi-int8-20250420`; Whisper chỉ là đối chứng M0, không thêm fallback đa-engine. Model hiện thử là offline transducer xử lý theo cửa sổ, không phải native streaming; tiếng Anh xen kẽ và các ngôn ngữ khác chưa kiểm chứng. Chưa làm full-duplex S2ST, voice cloning, multi-OS, diarization, multi-engine runtime, cloud translation hoặc TTS trong khi ghi nếu chưa có routing an toàn.

## 2. Đã kiểm tra gì trong my-translator?

Nguồn được đọc qua GitHub, không clone, cài dependency hoặc chạy code upstream.

Snapshot source: `3495f99e3c524f43a64fd93307a0140c1a2b25c8`.

| Thành phần | Bằng chứng | Giá trị cho WorkNote | Giới hạn |
| --- | --- | --- | --- |
| Tauri desktop + native capture | README; `src-tauri/src/audio/wasapi.rs` | Tham khảo WASAPI loopback trên Windows; capture không cần âm thanh thoát ra loa | Rust/native không cắm trực tiếp vào React web hoặc Python |
| Mic/system/both, transcript overlay | README | Học UX chọn nguồn, start/stop, trạng thái, transcript | Cần UI meeting note của WorkNote, không cần clone overlay app |
| Windows loopback | Đã đọc `wasapi.rs` | Default render endpoint, worker thread, PCM gửi qua channel | Snapshot dùng channel không giới hạn; conversion lấy channel đầu và lấy mẫu đơn giản; không nên bê nguyên vào đường audio production |
| Local audio-to-AI worker | Đã đọc `scripts/local_pipeline.py` | PCM stdin, JSON-lines stdout, log stderr; xử lý chunk và deduplicate | Dùng MLX, không chạy trực tiếp trên Windows CPU |
| Local STT + translation | `local_pipeline.py`; README | Tham khảo tổ chức pipeline | Whisper large-v3-turbo hoặc Qwen3-ASR qua MLX; Gemma qua MLX; không phải lựa chọn CPU nhẹ được kiểm chứng |
| Soniox/OpenAI/Qwen realtime | README | Tham khảo engine UX và trạng thái streaming | Dịch vụ bên ngoài; không đáp ứng mặc định offline/no paid API |
| Edge/Google/ElevenLabs TTS | README | Tham khảo nút đọc và xử lý phát audio | Không phải bằng chứng TTS offline; miễn API key không đồng nghĩa local |
| Transcript Markdown | README | Học export/session UX | Không thay thế SQLite, revision hoặc retrieval của meeting copilot |
| MIT license | Đã đọc `LICENSE` | Có thể tái sử dụng code theo điều kiện MIT | Giữ copyright và permission notice khi copy code đáng kể; dependency/model có license riêng |

### Những chi tiết không nên sao chép nguyên trạng

Tại snapshot đã đọc:

- Windows capture dùng default `eConsole` render endpoint: cần thử trường hợp ứng dụng họp dùng thiết bị output khác.
- Conversion trong `wasapi.rs` xử lý mẫu 32-bit như float, lấy channel đầu và downsample đơn giản. WorkNote phải xử lý định dạng thực tế, channel mix và resampling đúng; không mặc định mọi thiết bị giống nhau.
- Channel audio là unbounded: có nguy cơ tăng RAM khi consumer chậm.
- Stop dùng atomic flag, không có join handle; lỗi worker có thể để trạng thái capturing không phản ánh thực tế. WorkNote cần trạng thái dựa trên worker lifecycle.
- Local pipeline dùng cửa sổ 7 giây, bước 5 giây và RMS silence gate, không phải native streaming/VAD chuyên dụng. Không dùng nó để cam kết subtitle 0,5–2 giây.
- Local translation prompt còn giả định tiếng Nhật ở một số chỗ. Không coi pipeline hiện tại là cấu hình tiếng Việt tổng quát.

Đây là nhận xét từ source đã đọc, chưa phải kết quả chạy thử hay audit toàn repository.

## 3. Tận dụng WorkNote hiện có, không dựng lại ứng dụng

Các điểm tích hợp cần kiểm tra khi bắt đầu implementation trên nhánh hiện tại:

| Có sẵn | Hướng tận dụng |
| --- | --- |
| `src/components/AudioSpeechLab.tsx` | Tái sử dụng controls/hiển thị phù hợp; tách meeting flow mới khỏi browser SpeechRecognition và Google Translate hiện tại |
| `server/websockets/index.ts` | Giữ WebSocket infrastructure hiện tại; thêm meeting protocol riêng thay vì đổi contract `/api/ws/translate` |
| `server/websockets/liveAudioTranslateHandler.ts` | Cloud translation flow cũ không phải STT local; không dùng demo response làm transcript thật |
| `server/services/localLlmSupervisor.ts` | Đã có supervisor khởi động Python local LLM; tham khảo lifecycle, health check và threads trước khi thêm Ollama |
| `server/python/local_llm_server.py` | Đánh giá local LLM hiện có trước khi thêm runtime thứ hai |
| `server/services/embedService.ts`, `server/python/librarian_embed.py` | Có retrieval worker; MVP meeting dùng SQLite FTS5 trước, không buộc tải embedding |
| `src/components/NotebookWorkspace.tsx` | Tái sử dụng note/Q&A/export UX khi phù hợp; không gắn mỗi final segment thành một document riêng |
| `src/components/MindMapViewer.tsx`, `src/utils/mindMapAdapter.ts` | Ưu tiên chuyển note JSON thành cấu trúc mindmap đang dùng; không thêm Mermaid renderer nếu không cần |
| `server/routes/ttsRead.ts` | Có `msedge-tts`, nhưng không phải offline TTS; giữ flow cũ, thêm local TTS chỉ khi voice/license đạt yêu cầu |

Đã trực tiếp xác nhận ở working tree: `localLlmSupervisor.ts` có `startLocalLlmSupervisor()`, health check `/models`, model path, threads và child process lifecycle; `AudioSpeechLab.tsx` có browser mic/STT và Google Translate; `ttsRead.ts` import `msedge-tts`; WebSocket cũ đăng ký `/api/ws/translate`.

Một phần khảo sát còn lại được thực hiện trong worktree tham chiếu và có thể khác nhánh hiện tại. Vì vậy bảng này là bản đồ tái sử dụng, không phải cam kết mọi service đã được chạy hoặc tương thích. Không kết luận WorkNote chưa có local LLM.

## 4. Kiến trúc tối thiểu được khuyến nghị

Giữ Node backend và React UI hiện tại. Thêm **một audio/STT worker local**, không đồng thời dựng Python daemon HTTP, Rust helper, Tauri shell và Ollama mới.

```text
WorkNote React UI
    ↕ HTTP/WebSocket hiện có + meeting contract mới
WorkNote Node backend
    ├─ SQLite session/final transcript
    ├─ một job LLM tại một thời điểm
    └─ audio/STT worker local
          capture callback → bounded buffer → STT
          PCM chỉ nội bộ worker; final/status → Node
```

Ưu tiên thử Python worker + backend WASAPI loopback đã kiểm chứng, học cách IPC từ my-translator. Nếu capture Python không đáp ứng trên phần cứng mục tiêu, lúc đó mới cân nhắc Rust capture helper tham khảo `wasapi.rs`. Đây là quyết định sau feasibility, không phải hai implementation phải xây cùng lúc.

Không đưa PCM lên frontend/cloud trong chế độ local. Serve UI local cho MVP; hosted HTTPS UI kết nối localhost là bài toán triển khai riêng.

Local LLM hiện có được thử trước. Chỉ đổi sang Ollama khi có thiếu hụt cụ thể về chất lượng, triển khai hoặc resource control; tránh giữ hai model lớn cùng resident.

## 5. Lộ trình và cổng nghiệm thu

### M0 — Feasibility spike trước khi chốt stack

Tiến độ 16/10/2026: **đã chốt Sherpa Việt int8 cho MVP tiếng Việt, chưa đạt toàn bộ gate**. Đã cài/kiểm chứng dependency, đối chiếu hash hai checkpoint, capture mic/loopback, benchmark hai engine trên audio thực ~180 giây và Sherpa replay-paced 180 giây. Xem [kết quả và quyết định M0](meeting_m0_results.md#9-kết-quả-bổ-sung-và-quyết-định-engine--16102026).

- Audio thực, 2 threads/window 5 giây: Sherpa RTF 0.01449, processing P95 0.079 giây; Whisper RTF 0.50100, P95 6.0868 giây. Chưa có reference/WER/CER cho mẫu này; người dùng đánh giá transcript tiếng Việt tốt.
- Sherpa offline cùng LLM: RTF 0.02378, P95 0.1402 giây, overlap 100% của pass 4.281 giây; không phải tải đồng thời suốt 3 phút.
- Replay-paced 180 giây dùng đoạn 10 giây lặp: queue peak 1, wait max 0.032 giây, `finite_replay_only`; LLM overlap chỉ 4.17% nên tải đồng thời dài vẫn `inconclusive`. RAM khả dụng thấp nhất ~742 MiB.
- Còn để đóng gate: replay audio thực đại diện với tải LLM đủ coverage, reference/review tên–số–deadline–phủ định, capture im lặng → có tiếng/stop–restart/Ctrl+C/mất thiết bị, chốt latency thực tế. License riêng bản ONNX cần làm rõ trước phân phối. Không thêm engine hoặc benchmark lại Whisper nếu không có lỗi/yêu cầu cụ thể.

Ước lượng: 2–3 ngày làm việc, có thể dài hơn nếu driver/model không phù hợp.

- Test mic và WASAPI loopback trên Windows với tai nghe.
- Test output mặc định và output thiết bị họp thực tế, input im lặng, stop/restart, rút thiết bị.
- Thử tối đa hai cấu hình STT có tiếng Việt: một model sherpa-onnx phù hợp và một Whisper multilingual nhỏ.
- Phân biệt native streaming với chunked near-realtime; engine hỗ trợ streaming không bảo đảm model tiếng Việt là streaming.
- Dùng audio Việt–Anh xen kẽ, tên người, số, deadline, câu ngắn/phủ định và khoảng im lặng.
- Đo STT khi chạy đơn lẻ và cùng một tác vụ local LLM.
- Chốt engine/model, sample format, dependency/license và máy baseline sau kết quả đo.

**Gate:** capture ổn, chất lượng tiếng Việt đủ dùng theo tập kiểm thử, STT processing không tạo backlog tăng mãi. Nếu không đạt, giảm scope/đổi model; không xây summary trên transcript chưa đủ chất lượng.

### M1 — Meeting session + transcript bền vững

Ước lượng: 4–6 ngày sau M0.

- Mock event dùng đúng schema production trước khi thêm capture thật.
- Start/stop, source selector, audio meter và status tối thiểu trong UI hiện có.
- Interim chỉ UI; final raw lưu SQLite trước khi gửi event cho UI.
- Reconnect đọc lại final đã lưu; không tạo segment trùng.
- Stop flush dữ liệu còn lại và chốt session.
- Export Markdown; cảnh báo mất audio và lỗi worker.

**Gate:** ghi 60 phút trên máy baseline; UI reconnect không mất/nhân đôi final; backend/worker stop rõ ràng; không giả vờ ghi khi worker chết. Drop/gap phải hiện trên UI/export.

### M2 — Smart note có nguồn

Cập nhật 27/10/2026: người dùng chấp nhận M1 chuyển M2 cùng giới hạn STT. Đã triển khai storage/API/UI và batch **sau Stop** để ưu tiên capture; 46 backend/22 frontend tests PASS, nhưng smoke local LLM thật chưa đạt (timeout/output bị cắt; JSON-mode mới chưa chạy lại). Chưa nghiệm thu M2. Xem [kết quả M2](meeting_m2_results.md).

Ước lượng: 3–4 ngày.

- Chạy batch khi có final mới; một LLM job tại một thời điểm.
- Giới hạn context/output; coalesce pending summary, không queue vô hạn.
- Note gồm summary, key points, decisions, action items, open questions.
- Decision/action item có `source_segment_ids`; assignee/deadline chưa rõ để null.
- JSON schema validation trước khi lưu; lỗi output giữ note tốt gần nhất.
- Lưu watermark và note revision. Retry không tạo action item trùng.
- Khi kết thúc session, có thể tổng hợp lại từ transcript/chunk để giảm sai lệch rolling summary.

**Gate:** note có bằng chứng transcript, không làm backlog STT tăng liên tục, lỗi JSON không làm mất note/final.

### M3 — Q&A trên stable transcript

Ước lượng: 3–5 ngày.

- SQLite FTS5/BM25 nếu bản SQLite đóng gói có hỗ trợ.
- Lọc đúng session; retrieve chunk + recent final khi phù hợp; không dùng interim.
- Trả lời kèm segment/timestamp; hiện watermark dữ liệu đã xử lý.
- Transcript là dữ liệu không tin cậy, không được trở thành system instruction.
- Kiểm thử thông tin không tồn tại, câu phủ định, deadline đổi về sau và tên tương tự.

**Gate:** câu trả lời tham chiếu được nguồn; biết thiếu dữ liệu; không lấy nội dung session khác; STT vẫn hoạt động khi hỏi đáp.

### M4 — Mindmap và TTS on-demand

Ước lượng: 2–4 ngày, sau khi lõi đạt gate.

- Dựng mindmap từ note JSON sang adapter/viewer hiện có; không cần lần gọi LLM thứ hai.
- Thử voice Piper tiếng Việt cụ thể và license runtime/model trước khi đóng gói.
- TTS chỉ đọc sau stop/end trong cấu hình mặc định.
- Khi đang ghi, chỉ mở playback nếu đã kiểm chứng output không lọt vào capture, hoặc người dùng chủ động chấp nhận tạm dừng ghi và gap được đánh dấu.
- Cancel playback/error phải trở về trạng thái đúng.

**Gate:** text được đọc, stop hoạt động; không có echo âm thầm và không bỏ lời họp chỉ vì overlap timestamp.

### Ngoài MVP

Translation subtitle, Tauri packaging, multi-OS, both-source synchronization, diarization và TTS routing nâng cao được xét sau. Không port MLX pipeline sang Windows bằng cách thêm nhiều runtime ngay từ đầu.

**Tiến độ:** nếu chỉ có hai tuần, chọn M0 + M1 + summary cơ bản. Full roadmap khoảng 14–22 ngày làm việc theo các khoảng trên, chưa gồm buffer đóng gói/debug. Đây là ước lượng, không phải deadline bảo đảm.

## 6. Contract và storage bắt buộc

Meeting event tối thiểu:

```json
{
  "type": "transcript.final",
  "protocol_version": 1,
  "session_id": "session_uuid",
  "seq": 42,
  "segment": {
    "id": "segment_uuid",
    "revision": 1,
    "start_ms": 12000,
    "end_ms": 14500,
    "source": "system",
    "text_raw": "Thứ sáu nhé."
  }
}
```

- Đồng hồ monotonic theo session cho timestamp audio; wall clock riêng cho ngày tạo.
- Interim có identity/revision để thay thế trên UI, không chỉ append text.
- Event cần session isolation, ordered sequence và replay final; không cần replay interim.
- Các trạng thái: starting, recording, stopping, stopped, error; worker chết không được giữ recording.
- SQLite có sessions, final segments, chunks, chunk–segment relation, notes/watermarks và gap events.
- Foreign keys, index session/time, migration và transaction; final write là source of truth.
- Cleanup không overwrite `text_raw`; lưu clean/revision riêng. Sửa transcript làm invalidation chunk/note liên quan, không index hai bản như hai câu khác nhau.
- Không loại mọi final ngắn hơn 1 giây/20 ký tự. Câu ngắn có thể là quyết định; ghép vào chunk gần nó.
- Exact overlap dedup khác với xóa câu được người tham gia nhắc lại thật.

## 7. Resource scheduling và overload

Audio callback không inference, không DB/network I/O. Worker audio/STT độc lập với job LLM và tốc độ UI.

- Bounded buffer/queue; xác định capacity bằng đo thực tế.
- Dùng audio age/backlog và STT processing time làm tín hiệu chính; CPU/RAM bổ trợ.
- Hoãn summary/mindmap bằng hysteresis; không bật/tắt theo một mẫu CPU.
- Một job LLM tại một thời điểm; Q&A ưu tiên hơn pending summary. Không giả định pending priority có thể preempt job đang chạy.
- Giới hạn context/output trước khi generate; kiểm chứng cancel thực sự giảm tải.
- Buffer đầy kéo dài: cảnh báo, ghi gap hoặc dừng có lỗi rõ ràng; không tăng RAM vô hạn/âm thầm drop.
- Lưu audio để xử lý bù không mặc định bật; nếu thêm phải có dung lượng tối đa, retention và thông báo riêng tư.

Mục tiêu đo ban đầu: partial subtitle 0,5–2 giây **nếu engine hỗ trợ**, final 1–2 giây sau endpoint, backlog không tăng liên tục. Báo cáo P50/P95 trên máy baseline; không ghi các số này thành kết quả đạt được trước benchmark.

## 8. Bảo mật và quyền riêng tư

- Node/worker endpoint chỉ bind loopback; không `0.0.0.0` mặc định.
- Nếu mở daemon HTTP/WebSocket riêng: validate Origin, client authentication, payload size/schema và start/stop commands.
- Không chấp nhận shell command/model path/file path tùy ý từ UI.
- Không log transcript đầy đủ mặc định; hiển thị trạng thái ghi âm và thông báo consent phù hợp bối cảnh.
- Cho xóa session/transcript/export và quy định retention; không tự upload cloud fallback.
- Markdown/mindmap label phải được render an toàn, không execute nội dung do transcript/LLM sinh ra.
- Khi copy code upstream, ghi provenance + snapshot và giữ MIT notice; kiểm tra license dependency/model riêng.

## 9. Checklist trước khi implementation

- [ ] Xác nhận phần cứng baseline và thiết bị mic/output.
- [x] Benchmark hai engine và chọn Sherpa Việt int8 cho tiếng Việt; mode đã thử là offline/chunked, chưa xác nhận native streaming hoặc ngôn ngữ khác.
- [ ] Kiểm tra local LLM hiện có trên nhánh đang làm trước khi thêm Ollama.
- [ ] Kiểm tra App/sidebar/tab wiring; không giả định WorkNote đang dùng router `/meeting`.
- [ ] Đọc callers/contracts của WebSocket, notebook, mindmap và TTS trước khi tái sử dụng.
- [ ] Chọn một worker/capture backend, chưa xây cả Python + Rust + Tauri.
- [ ] Test fake event/reconnect/idempotency với schema final thật.
- [ ] Test capture/STT/LLM cùng chạy, bounded backlog và worker crash.
- [ ] Test TTS output lọt vào loopback; mặc định chỉ đọc sau dừng ghi.
- [ ] Test FTS5 trong bản đóng gói; prompt injection, session isolation và dữ liệu nhạy cảm.
- [ ] Giữ nguyên flow cloud/demo cũ; local meeting không giả transcript nếu engine chưa sẵn sàng.

## 10. Nguồn và giới hạn kiểm chứng

- [my-translator repository/README](https://github.com/phuc-nt/my-translator).
- [Windows WASAPI source tại snapshot](https://github.com/phuc-nt/my-translator/blob/3495f99e3c524f43a64fd93307a0140c1a2b25c8/src-tauri/src/audio/wasapi.rs).
- [Local MLX pipeline tại snapshot](https://github.com/phuc-nt/my-translator/blob/3495f99e3c524f43a64fd93307a0140c1a2b25c8/scripts/local_pipeline.py).
- [MIT license tại snapshot](https://github.com/phuc-nt/my-translator/blob/3495f99e3c524f43a64fd93307a0140c1a2b25c8/LICENSE).
- [sherpa-onnx pretrained models](https://k2-fsa.github.io/sherpa/onnx/pretrained_models/index.html).
- [Piper hiện hành](https://github.com/OHF-Voice/piper1-gpl).

Source review/README không thay thế benchmark. Chưa chạy my-translator. WorkNote M0 đã kiểm tra WASAPI trên thiết bị thật và benchmark STT local; người dùng chốt Sherpa cho tiếng Việt, nhưng còn các giới hạn/gate chưa hoàn tất ở mục M0 và tài liệu kết quả. Chưa xác nhận Piper tiếng Việt, ngôn ngữ STT khác, toàn bộ security hoặc toàn bộ dependency/model license. Đợt cập nhật tài liệu này không thay đổi runtime WorkNote.
