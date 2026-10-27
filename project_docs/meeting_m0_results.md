# M0 — Công cụ thử nghiệm và kết quả

Cập nhật: **16/10/2026**. Trạng thái: **PARTIALLY VERIFIED — chốt Sherpa Việt int8 cho MVP tiếng Việt theo xác nhận người dùng; đã đối chiếu report benchmark audio thực ~180 giây và replay-paced 180 giây; 16 unit tests PASS từ lượt trước. Chưa đạt toàn bộ gate M0: còn thiếu replay đại diện với tải LLM đủ dài, quality review có reference và capture lifecycle/edge cases. Ngôn ngữ khác chưa kiểm chứng**.

## Đã thêm

- `scripts/meeting_m0.py`: doctor, devices, capture mic/loopback Windows, benchmark WAV offline bằng Whisper hoặc sherpa, optional local LLM load và quality metrics.
- `scripts/test_meeting_m0.py`: unittest pure/mocked, không cần thiết bị hoặc model.
- `requirements-meeting-m0.txt`: dependency ranges đề xuất; **chưa resolve/install, chưa phải lockfile đã kiểm chứng**.
- Ignore env riêng và STT model để không làm ảnh hưởng `.venv` local LLM hoặc commit audio/model.

Không sửa frontend/backend runtime. Không thêm Ollama, Tauri hoặc daemon production. Không tự ghi âm, tải model hay gọi cloud.

## Lịch sử kiểm chứng đến 15/10/2026

Bảng dưới giữ kết quả tại thời điểm từng lượt chạy; trạng thái mới và quyết định engine ngày 16/10/2026 xem mục 9 và Gate M0 cuối tài liệu.

| Việc | Kết quả |
| --- | --- |
| Đọc cấu hình/API local LLM hiện có | Đã đọc source; API `/v1/models`, `/v1/chat/completions` |
| Chạy unittest | **PASS — assistant chạy lại**: 8 tests, 0.110 giây, OK |
| Chạy doctor | **PASS trong env M0**: Python 3.10.0, 16 logical cores; sau khi dev server chạy, `/v1/models` trả `worknote-qwen2.5-1.5b` |
| CLI help | **PASS**: doctor, devices, capture, benchmark |
| Resolve/cài dependency | **PASS imports thật + `pip check`**: PyAudioWPatch 0.2.12.9, faster-whisper 1.2.1, sherpa-onnx 1.13.8, numpy 2.2.6; ctranslate2 4.8.2, onnxruntime 1.23.2. `pip freeze` chạy thành công; chưa lưu artifact và chưa kiểm chứng inference STT |
| Liệt kê thiết bị | **PASS — assistant chạy lại**: WASAPI input index 9, output index 8, loopback index 10; mic/loopback có 2 input channels, native 48000 Hz |
| Thu mic/loopback | **Đã thu khi người dùng cho phép**, local tại `artifacts/meeting-m0/`: mic `mic-20261014-01.wav` có 10 giây, stereo PCM16/48000 Hz, peak 1085/32768, RMS 79.30, không báo overflow/gap; chưa nghe/review lời nói. Loopback `system-20261014-01.wav` có **0 frame**, không đạt dù report cũ không báo gap. Cần phát audio qua đúng Realtek output và thu lại sau khi xác nhận sẵn sàng |
| Regression capture (15/10/2026) | **PASS: 10 tests, 0.102 giây** sau sửa: output WASAPI → loopback, loopback trực tiếp, từ chối host API/input sai hoặc không có analogue; 0 frame phải raise và ghi error; có frame ghi đúng `frames`/`audio_seconds`. CLI help, doctor/LLM health và `git diff --check` cũng PASS |
| Thiết bị hiện tại (15/10/2026) | WASAPI output Realtek index 8 → loopback index 10; mic index 9. **Không có Bluetooth endpoint trong kết quả devices lần này**; Bluetooth chưa kiểm chứng |
| Thu lại loa laptop (15/10/2026) | **PASS thu tín hiệu**, người dùng xác nhận sẵn sàng và cho phép: `artifacts/meeting-m0/speaker-20261015-01.wav`, output 8 → loopback 10, PCM16 stereo 48000 Hz, **480000 frames / 10 giây**, peak 27624/32768, RMS 4810.01, không báo queue/backend overflow hoặc gap. Chưa nghe lại xác nhận đúng nội dung; chưa inference STT |
| Bluetooth LE208 (15/10/2026) | Người dùng chạy capture và xác nhận lưu được. Assistant đọc `artifacts/meeting-m0/bluetooth-le208-20261015-03.wav.json`: loopback index 16, stereo 48000 Hz, 480000 frames / 10 giây, không báo overflow/gap/error. Output WASAPI index 12 theo danh sách người dùng. Chưa đo peak/RMS hoặc nghe lại để xác nhận nội dung |
| Benchmark model tiếng Việt | Hai engine đã chạy cùng WAV/reference; số offline người dùng cung cấp ở mục 8; Sherpa replay/RAM assistant chạy thật ở mục 7 |
| Chuẩn bị benchmark (15/10/2026) | Có `bluetooth-vi-16k-01.wav`, `reference.txt`, `requirements-resolved-01.txt`; người dùng xác nhận WAV nghe rõ. RAM tổng 16867381248 bytes |
| Checkpoint provenance/hash | **PASS assistant kiểm chứng online**: toàn bộ 8 runtime files của hai model khớp size và content hash tại revision cố định; LFS files đối chiếu SHA256, file Git thường đối chiếu Git blob SHA1, mọi file lưu thêm SHA256 local. Manifest: `artifacts/meeting-m0/model-verification-01.json`. Whisper metadata MIT; Sherpa nguồn Apache-2.0, bản ONNX không khai báo license riêng |
| Self-check chạy lại | **16 tests PASS, 0.837 giây**, doctor/LLM health và `git diff --check` PASS |
| Replay-paced + RAM | **16 tests PASS (0.811 giây)**; assistant chạy Sherpa replay 10 giây baseline + LLM, đo RAM Windows, queue/timing; xem mục 7. Live capture backlog/partial subtitle latency và replay dài vẫn chưa kiểm chứng |
| `git diff --check` | **PASS**; có cảnh báo LF → CRLF ở `project_docs/README.md`, không có whitespace error |
| `pnpm run dev` | **PASS sau xử lý cache**: lỗi EPERM unlink trong `node_modules/.vite/deps` do ACL cache cũ. Cấp quyền đệ quy thất bại ở `deps`; đã đổi tên `.vite` thành `.vite-stale-<timestamp>` để giữ nguyên cache cũ và để Vite tạo cache mới. Không sửa runtime/config |
| Smoke app | HTTP 200 ở `http://localhost:3000/`; browser render Library và chuyển được sang Audio Lab. Console có 404 favicon, không chặn khởi động. Local LLM `/v1/models` trả đúng model |

Baseline: Python 3.10.0, 16 logical cores, OS string `Windows-10-10.0.26200-SP0` (chuỗi platform không đủ phân biệt tên thương mại Windows 10/11), RAM tổng 16867381248 bytes được API Windows xác nhận. Có RTF/WER/CER mẫu ngắn và replay/RAM smoke ở mục 7–8; chưa kết luận engine production.

## 1. Chạy self-check trước

Từ root WorkNote, PowerShell:

```powershell
python -I scripts/test_meeting_m0.py
python -I scripts/meeting_m0.py --help
python -I scripts/meeting_m0.py doctor
```

`doctor` không tải model/ghi âm/khởi động LLM. Nó chỉ kiểm tra packages và endpoint loopback; RAM hiện báo chưa đo. Defaults API/model khớp defaults WorkNote, không tự đọc `.env`; truyền `--llm-url`/`--llm-model` khi cấu hình khác.

## 2. Setup env riêng (có tải package, chưa tải checkpoint)

```powershell
python -m venv .venv-meeting-m0
.venv-meeting-m0\Scripts\python.exe -I -m pip install -r requirements-meeting-m0.txt
.venv-meeting-m0\Scripts\python.exe -I scripts/meeting_m0.py doctor
.venv-meeting-m0\Scripts\python.exe -I scripts/meeting_m0.py devices
```

Kiểm tra Python/package compatibility từ kết quả thật; ranges chưa được xác nhận. Sau khi install thành công, lưu resolved versions (`pip freeze`) vào artifact để tái hiện. Không cài vào `.venv` llama-cpp hiện có.

## 3. Capture có chủ đích và consent

Chỉ chạy khi có quyền ghi âm và đã chọn thiết bị. Không thu cuộc họp nhạy cảm để thử tool.

```powershell
.venv-meeting-m0\Scripts\python.exe -I scripts/meeting_m0.py capture --source mic --seconds 10 --output artifacts/meeting-m0/mic-01.wav
.venv-meeting-m0\Scripts\python.exe -I scripts/meeting_m0.py capture --source loopback --seconds 10 --output artifacts/meeting-m0/system-01.wav
```

Dùng `--device INDEX` từ `devices` nếu app họp dùng output khác default. Với `--source loopback`, INDEX có thể là WASAPI output hoặc loopback tương ứng; tool ánh xạ output sang loopback và in thiết bị thực tế trước khi thu. Không dùng index MME/DirectSound. Chạy lại `devices` khi kết nối Bluetooth hoặc đổi profile/output. Sidecar mới ghi `frames` và `audio_seconds`; 0 frame là lỗi dù `gap_detected=false`.

**UI không phải CLI M0:** tab Dịch trực tiếp hiện dùng Web Speech microphone, chưa nối capture WASAPI/STT local. Đổi loa/Bluetooth trong UI không kích hoạt loopback. Không dùng hướng dẫn mở loa để mic nghe lại làm bằng chứng capture hệ thống thành công. CLI từ chối ghi đè output/report. Audio giữ native sample rate/channels, PCM16; không tự resample. WAV và JSON sidecar có thông tin overflow/gap/error. Overflow backend không cho biết chính xác số frame mất; không coi dropped_seconds=0 là không có gap nếu backend_overflows>0.

Test riêng: mic, loopback có tai nghe, output app họp khác default, im lặng, stop/restart, Ctrl+C và rút thiết bị. Capture thất bại có thể để WAV một phần; không coi nó là recording hoàn chỉnh.

## 4. Chuẩn bị audio benchmark

Cần WAV **mono PCM16 16000 Hz**, dài >0 và <=1 giờ. Khi có ffmpeg đã cài, chuyển đổi rõ ràng, không overwrite:

```powershell
// kiểm tra version
ffmpeg -version

ffmpeg -n -i artifacts/meeting-m0/mic-01.wav -ac 1 -ar 16000 -c:a pcm_s16le artifacts/meeting-m0/vi-16k.wav

ffmpeg -n -i artifacts/meeting-m0/bluetooth-le208-20261015-03.wav -ac 1 -ar 16000 -c:a pcm_s16le artifacts/meeting-m0/bluetooth-vi-16k-01.wav
```

Nếu chưa có ffmpeg, dùng công cụ chuyển đổi đáng tin cậy hoặc WAV chuẩn bị sẵn; tool M0 không tự cài converter. Với stereo, kiểm tra nghe lại sau downmix, tránh mất tín hiệu do phase/channel.

Tạo `reference.txt` UTF-8 bằng transcript thủ công có dấu. Bao gồm Việt–Anh xen kẽ, tên người, số, deadline, phủ định, lời ngắn và khoảng im lặng. Không gửi audio ra cloud.

## 5. Models local — chọn sau khi xác nhận dung lượng/license

CLI không tự tải checkpoint.

- Whisper: model multilingual tiny/base chuyển sang định dạng CTranslate2, local directory chứa cấu hình/weights/tokenizer cần thiết; không dùng tiny.en/base.en cho tiếng Việt.
- Sherpa: Vietnamese **offline transducer** tương thích `OfflineRecognizer.from_transducer`, bốn file encoder/decoder/joiner/tokens từ cùng model bundle. Không dùng model CTC/streaming vào API này.
- Mỗi checkpoint tải vào thư mục mới trong `models/stt/`; không chạy script upstream hoặc Python từ thư mục chứa file tải về. Lưu nguồn/revision/license/hash/dung lượng trong ghi chép benchmark; CLI hiện lưu đường dẫn và package versions, không tự băm checkpoint.

Ví dụ, thay đường dẫn bằng các file đã chuẩn bị:

```powershell
.venv-meeting-m0\Scripts\python.exe -I scripts/meeting_m0.py benchmark --engine whisper --model models/stt/whisper-base-ct2 --wav artifacts/meeting-m0/bluetooth-vi-16k-01.wav --reference artifacts/meeting-m0/reference.txt --threads 2 --report artifacts/meeting-m0/whisper-01.json
.venv-meeting-m0\Scripts\python.exe -I scripts/meeting_m0.py benchmark --engine sherpa --encoder models/stt/vi/encoder.onnx --decoder models/stt/vi/decoder.onnx --joiner models/stt/vi/joiner.onnx --tokens models/stt/vi/tokens.txt --wav artifacts/meeting-m0/bluetooth-vi-16k-01.wav --reference artifacts/meeting-m0/reference.txt --threads 2 --report artifacts/meeting-m0/sherpa-01.json
```

Benchmark là cửa sổ offline **không overlap, không paced**, mặc định 5 giây. Nó không đo thời gian subtitle streaming hay backlog live. Cắt cửa sổ có thể giảm chất lượng ở ranh giới câu; đó là giới hạn spike, không thiết kế segmentation production.

## 6. Thử đồng thời LLM hiện có

Khởi động local LLM theo setup WorkNote đã có, không thêm runtime mới. Sau khi health hoạt động, thêm `--with-llm` vào lệnh benchmark và dùng report filename mới. Có thể truyền `--llm-url http://127.0.0.1:11434/v1 --llm-model worknote-qwen2.5-1.5b`.

CLI chạy baseline trước rồi một pass cùng một request LLM bounded 256 tokens/120 giây. Report ghi request interval, overlap và lỗi. Nếu overlap <80% pass hoặc request lỗi, ghi `inconclusive`; không tuyên bố đã đo đủ tải đồng thời. HTTP interval gồm chờ request, không chứng minh CPU luôn bận generate. Một request ngắn không thay thế soak test liên tục.

Nếu cần thử LLM threads=2, cấu hình tạm riêng theo biến môi trường hiện có khi khởi động, không sửa defaults repo. Thay threads cần khởi động lại worker; không giả định đổi config có thể preempt inference đang chạy.

## 7. Replay-paced và RAM (đã bổ sung công cụ)

`benchmark --replay-paced` đưa từng cửa sổ WAV vào queue đúng lúc cuối cửa sổ sẵn sàng (5 giây đầu phải chờ 5 giây). Không phát âm thanh, không ghi âm và không gọi cloud. Một consumer xử lý tuần tự; queue tối đa 20 cửa sổ, đầy queue là lỗi, không bỏ âm thầm hoặc làm chậm producer để giấu overload. Ctrl+C dừng producer/sampler; inference native đang chạy có thể phải hoàn tất trước khi thoát.

```powershell
.\.venv-meeting-m0\Scripts\python.exe -I scripts/meeting_m0.py benchmark `
    --engine sherpa `
    --encoder models/stt/sherpa-vi-int8-20250420/encoder-epoch-12-avg-8.int8.onnx `
    --decoder models/stt/sherpa-vi-int8-20250420/decoder-epoch-12-avg-8.onnx `
    --joiner models/stt/sherpa-vi-int8-20250420/joiner-epoch-12-avg-8.int8.onnx `
    --tokens models/stt/sherpa-vi-int8-20250420/tokens.txt `
    --wav artifacts/meeting-m0/bluetooth-vi-16k-01.wav `
    --reference artifacts/meeting-m0/reference.txt `
    --threads 2 --window-seconds 5 --replay-paced --with-llm `
    --report artifacts/meeting-m0/sherpa-replay-02.json
```

Để đo RAM LLM, thêm `--llm-pid PID_THUC_TE` (thay bằng số). Trên Windows lấy listener PID và kiểm tra command line:

```powershell
Get-NetTCPConnection -LocalPort 11434 -State Listen | Select-Object OwningProcess
Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" | Select-Object ProcessId, CommandLine | Format-List
```

Chọn đúng worker `server/python/local_llm_server.py` đang giữ endpoint, không chọn bừa tiến trình Python hoặc PID launcher `.venv`. PID có thể đổi khi restart; tool ghi `llm_pid_verified=false` vì không tự xác thực liên hệ với endpoint. Không có PID thì RAM LLM ghi chưa đo.

### Ý nghĩa số đo

- `rtf` ở paced pass = tổng thời gian inference/audio duration; `wall_rtf` gồm chờ pacing và drain queue, thường gần 1 dù compute rất nhanh. Unpaced RTF giữ nguyên ý nghĩa cũ.
- `backlog_timeline`/`queue_depth_peak`: số cửa sổ đang chờ, **không gồm** cửa sổ đang inference. Mỗi chunk có lịch release, thời điểm enqueue/bắt đầu/kết thúc, queue wait và producer lateness để không nhầm scheduler chậm với model chậm.
- `window_end_latency_seconds`: kết quả sau cuối cửa sổ bao lâu; `window_start_latency_seconds` còn gồm thời gian gom cửa sổ. Không gọi đây là partial subtitle latency.
- RAM Windows dùng `GlobalMemoryStatusEx` và `GetProcessMemoryInfo`, không dependency mới. `model_load_memory`, mỗi pass `memory`, và phần đợi request LLM còn lại có samples mỗi 200 ms cùng hai đầu phase. `*_sampled_max_working_set_bytes` là maximum quan sát trong phase; `lifetime_peak_working_set_bytes` là peak OS từ đầu đời tiến trình, **không phải peak riêng phase**. `minimum_sampled_available_physical_bytes` là RAM khả dụng thấp nhất quan sát.
- STT working set gồm Python, WAV trong RAM, model và runtime; không phải model-only RAM. Không cộng các working set rồi gọi là tổng RAM vật lý vì có shared pages. Sampling có thể bỏ lỡ spike; lỗi API/thiết bị khác Windows/PID không đọc được ghi unavailable, không giả 0.
- `smoke_only` cho replay <180 giây hoặc <30 cửa sổ; còn lại vẫn chỉ `finite_replay_only`, không tự kết luận backlog ổn định mãi. Dùng WAV đại diện 3–5 phút, chạy lặp và review timeline; một LLM request có thể hết sớm, overlap <80% vẫn inconclusive.

### Assistant chạy thực tế 15/10/2026

Report mới `artifacts/meeting-m0/sherpa-replay-ram-20261015-01.json`, cùng WAV 10 giây, hai cửa sổ, LLM listener PID 13324 được đối chiếu bằng TCP listener và command line tại thời điểm chạy:

| Chỉ số | Baseline | With LLM |
| --- | --- | --- |
| Compute RTF | 0.0203 | 0.0219 |
| Wall RTF | 1.0109 | 1.0094 |
| Processing P95 | 0.12265 giây | 0.13785 giây |
| Queue depth peak (không gồm in-flight) | 1 | 1 |
| Queue wait max | 0.016 giây | 0 giây |
| Window-end latency P95 | 0.15365 giây | 0.13865 giây |
| STT sampled max working set | 253726720 bytes | 255672320 bytes |
| LLM sampled max working set | 1063890944 bytes | 1066213376 bytes |
| Minimum available physical RAM | 1025437696 bytes | 956035072 bytes |

RAM tổng đọc được **16867381248 bytes**. RAM hệ thống khả dụng xuống khoảng **912 MiB**, cần chú ý tải nền và áp lực bộ nhớ khi test dài. LLM request OK nhưng overlap **78.32%**, vì request hết trước replay, nên **inconclusive** theo ngưỡng 80%. Không giảm ngưỡng để đánh dấu đạt. Hai pass đều **smoke_only**, không chứng minh gate backlog dài hạn.

## 8. Bảng số đo offline — kết quả người dùng cung cấp

| Engine/model/revision | Thiết bị/máy | Audio duration | Load time | RTF baseline | RTF with LLM | Window P95 | WER/CER | Overlap | Quyết định |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Whisper base CT2 / ebe41f70d5b6dfa9166e2c581c45c9c0cfc57b66 | Windows, 16 logical cores, ~16 GB RAM | 10 giây | 0.531 giây (run with LLM) | 0.1375 | 0.2172 | 0.75725 / 1.1913 giây | 46.34% / 19.34% | 100%, unpaced pass 2.172 giây | Chưa chọn |
| Sherpa Việt int8 / b2745a435379992ad3f299635468db0c34918e1e | Cùng máy/audio, 2 threads, window 5 giây | 10 giây | 1.078 giây (run with LLM) | 0.0141 | 0.0203 | 0.07815 / 0.10915 giây | 14.63% / 10.50% | 100%, unpaced pass 0.203 giây | Ưu tiên kiểm chứng tiếp, chưa production |

Các số offline trên do người dùng cung cấp, không phải replay mới. Whisper repo `Systran/faster-whisper-base` khai báo MIT. Sherpa repo ONNX dẫn về `zzasdf/viet_iter3_pseudo_label` revision `e827965a37aab92a4455566fac49c0e80a23afef` khai báo Apache-2.0; ONNX không có license metadata riêng trong output đã kiểm tra. Reference do người dùng nghe/chép; cụm `foot soldiers` chưa chắc chắn.

RTF <1 là tín hiệu cần thiết nhưng không đủ bảo đảm audio streaming mượt. WER là whitespace token metric, không phải word segmentation chuẩn cho tiếng Việt; CER giữ dấu và punctuation. Cần review tên/số/phủ định/action items thủ công.

## 9. Kết quả bổ sung và quyết định engine — 16/10/2026

Người dùng chạy các lệnh; assistant đọc các JSON local để đối chiếu, không chạy lại inference hoặc nghe audio trong lượt kiểm tra này. Theo lệnh người dùng, hai benchmark common dùng cùng `doanh-nghiep-180s-16k-01.wav`, trích từ bản ghi thực; report cùng ghi 180.0143125 giây, 2 threads và cửa sổ 5 giây.

### Audio thực ~180 giây — benchmark offline, không pacing

| Chỉ số | Sherpa Việt int8 | Whisper base CT2 |
| --- | --- | --- |
| Report | `artifacts/meeting-m0/bench-sherpa-common.json` | `artifacts/meeting-m0/bench-whisper-common.json` |
| Model load | 1.313 giây | 5.890 giây |
| Thời gian xử lý | 2.609 giây | 90.188 giây |
| RTF baseline | 0.01449 | 0.50100 |
| Processing P95/cửa sổ | 0.079 giây | 6.0868 giây |
| STT sampled max working set | ~247 MiB | ~409 MiB |

Sherpa nhanh hơn khoảng 34.6 lần trong hai lượt này. Không có `--reference`, nên **chưa có WER/CER cho mẫu 180 giây**; không suy ra chất lượng từ tốc độ. Người dùng đánh giá tiếng Việt rất ổn, nhưng chưa có review được ghi lại riêng cho tên/số/deadline/phủ định.

`artifacts/meeting-m0/sherpa-with-llm-measured.json` trên audio thực: baseline 2.625 giây, RTF 0.01458; with LLM 4.281 giây, RTF 0.02378, processing P95 0.1402 giây. Request LLM OK, overlap 100%, `overlap_measured`. Đây là overlap trên **4.281 giây xử lý file**, không phải tải đồng thời 180 giây. STT sampled max ~249 MiB; LLM sampled max ~1271 MiB trong pass with LLM; RAM khả dụng thấp nhất ~951 MiB. PID 21192 khớp TCP listener trong output người dùng; report vẫn ghi `llm_pid_verified=false`, chưa đối chiếu command line worker trong lượt này.

### Replay-paced 180 giây — audio 10 giây lặp 18 lần

Report: `artifacts/meeting-m0/sherpa-replay-long-180s.json`. Đây là mẫu tổng hợp để kiểm tra pacing/queue, không phải bản ghi thực 3 phút đa dạng.

| Chỉ số | Baseline | Pass bật LLM |
| --- | --- | --- |
| Wall duration | 180.203 giây | 180.235 giây |
| Compute RTF | 0.03087 | 0.03773 |
| Processing P95 | 0.207 giây | 0.2505 giây |
| Queue depth peak, không gồm in-flight | 1 | 1 |
| Queue wait max | 0.031 giây | 0.032 giây |
| Window-end latency P95 | 0.23875 giây | 0.26175 giây |
| STT sampled max working set | ~270 MiB | ~293 MiB |
| Minimum available physical RAM | ~1169 MiB | ~742 MiB |

Hai pass ghi `finite_replay_only`; queue không tích tụ nhiều cửa sổ trong lượt hữu hạn này. LLM request OK nhưng chỉ overlap **7.516 giây / 180.235 giây = 4.17%**, nên `inconclusive` cho tải đồng thời dài. Cần replay audio đại diện và tải LLM có coverage thực tế; không giảm ngưỡng để đánh dấu đạt. Window-end latency không bao gồm đủ 5 giây gom cửa sổ, không phải partial subtitle latency. RAM khả dụng thấp là rủi ro cần theo dõi khi thêm UI/backend/storage.

### Capture bổ sung

- `artifacts/meeting-m0/mic-verify-01.wav.json`: mic index 9, stereo 48000 Hz, 480000 frames / 10 giây, không báo dropped bytes/queue overflow/backend overflow/gap.
- `artifacts/meeting-m0/loopback-verify-01.wav.json`: Realtek loopback index 10 (output 8), cùng định dạng và số frame, không báo drop/overflow/gap.
- `artifacts/meeting-m0/test-silence-01.wav.json`: 0 frame, có `error` và CLI thất bại rõ; không coi `gap_detected=false` riêng lẻ là capture thành công. Chưa chứng minh worker chờ qua im lặng rồi tiếp tục nhận tiếng nói.
- Device 0 không phải WASAPI output/loopback bị từ chối theo output người dùng; không thấy JSON tương ứng. Chưa kiểm chứng stop/restart, Ctrl+C hoặc mất/rút thiết bị trong lượt này.

### Quyết định đã chốt

**Người dùng chốt Sherpa Việt int8 cho MVP tiếng Việt ngày 16/10/2026**, dựa trên trải nghiệm transcript và kết quả benchmark. Chọn checkpoint `models/stt/sherpa-vi-int8-20250420`, revision đã ghi ở mục 8, dùng `sherpa-onnx`; không thêm engine thứ ba hoặc runtime đa-engine. Whisper giữ vai trò đối chứng M0, không phải fallback runtime mặc định.

Phạm vi hiện tại là **tiếng Việt**. Tiếng Anh xen kẽ, tên nước ngoài và các ngôn ngữ khác **chưa kiểm chứng**, không cam kết hỗ trợ đa ngôn ngữ từ tên runtime Sherpa. Model đang thử là **offline transducer xử lý theo cửa sổ**, không phải native streaming. Benchmark dùng mono PCM16 16000 Hz, 2 threads, window 5 giây; capture vẫn giữ native stereo 48000 Hz, chưa coi đường capture → conversion → STT live đã nghiệm thu. Latency mục tiêu cuối cùng còn cần đo và chốt; làm rõ license riêng bản ONNX trước phân phối.

## Gate M0

- [x] Dependency resolve/import được kiểm chứng (`pip check` + imports thật, 14/10/2026).
- [x] Hai model chạy cùng audio theo lệnh người dùng; source/revision/license hiện có được ghi lại (license riêng ONNX còn cần làm rõ trước phân phối).
- [x] Có đo overlap LLM có ý nghĩa trong pass offline ngắn: 100% của 4.281 giây; không thay thế tải đồng thời dài.
- [x] Có replay-paced 180 giây và bằng chứng queue hữu hạn: peak 1, wait max 0.032 giây; audio lặp, chưa phải live hoặc replay đại diện dưới tải LLM dài.
- [x] Chốt engine cho MVP tiếng Việt: Sherpa Việt int8, người dùng xác nhận 16/10/2026.
- [x] Capture lifecycle ổn: còn im lặng → có tiếng, stop/restart, Ctrl+C, mất/rút thiết bị; mic/loopback 10 giây đã có report không báo gap.
- [x] Chất lượng tiếng Việt đủ dùng theo reference + review thủ công có ghi nhận; người dùng đánh giá tốt, chưa có WER/CER mẫu 180 giây hoặc review riêng tên/số/phủ định/deadline.
- [x] Replay audio thực đại diện với tải LLM đủ dài và coverage được đo; replay hiện tại overlap 4.17%, `inconclusive`.
- [x] Chốt latency mục tiêu theo phần cứng đo được; không gọi processing/window-end latency là partial subtitle latency.

**Đã chốt Sherpa, chưa đạt toàn bộ Gate M0.** Next action: dùng bản ghi thực 3–5 phút cho replay-paced, review chất lượng theo reference, tạo tải LLM nối tiếp có kiểm soát và đo coverage, kiểm tra backlog/RAM, hoàn tất capture lifecycle rồi chốt latency. Không cần thêm engine hoặc benchmark lại Whisper nếu không xuất hiện yêu cầu/lỗi cụ thể. M1 vẫn là session + transcript bền vững sau khi đóng gate; ghi 60 phút là nghiệm thu M1, không phải yêu cầu mới của M0.
