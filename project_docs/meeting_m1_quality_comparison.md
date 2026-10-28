# M1 — Đối chiếu chất lượng phiên system audio

Ngày: **27/10/2026**. Trạng thái: **đã benchmark offline và replay 180s/engine; chưa đóng quality gate hoặc xác minh hai gap ngoài video**.

## Dữ liệu và căn chỉnh

- Transcript: `artifacts/meeting-m1/test-60p-system-meeting.md`.
- Tham chiếu do người dùng cung cấp: `artifacts/meeting-m1/test-1-audio.txt`.
- Bắt đầu đối chiếu ở segment **1226750–1231750 ms**, dòng 233 của export, không phải timestamp của video YouTube. Chủ đề xa xỉ thầm lặng kết thúc quanh **1701750 ms** (dòng 327); khoảng đối chiếu dài **475 giây (~7 phút 55 giây)**, phù hợp mô tả video khoảng 8 phút. Căn chỉnh này dựa trên nội dung, chưa có timestamp phụ đề/audio để căn chính xác từng từ.
- TXT không phải ground truth đã hiệu đính: chứa nhiều biến thể `khoa học Luxury`, `quay ở Luxury`, `khỏi Luxury`, `khoai Luxury`; có `sắp session`, `bên hành khô`, `chai xịt thầm lặng`. Không sửa những từ này theo suy đoán hoặc dùng trực tiếp làm lời chuẩn để chấm độ chính xác.
- Audio có sẵn dưới `artifacts/meeting-m1/youtube-V2Rj-tplz0Y-20261024-01/` đi kèm reference nói về tốc độ phát triển AI, **không phải** đoạn xa xỉ thầm lặng này. Không dùng audio khác nội dung để so engine cho đoạn đang xét.

## 1. Hai gap dài

| Gap trong phiên | Quan sát trước/sau | Kết luận có thể xác nhận |
| --- | --- | --- |
| 650375–741750 ms, 91,375 giây | Trước: cuối bài về AI, tiếp theo các segment `Ừ`. Sau: `Ừ`, rồi đầu bài về tỷ phú Mỹ | Có dấu hiệu đổi bài/nguồn idle, nhưng chưa chứng minh nguồn đã pause. Cần lịch phát hoặc audio; không xóa cảnh báo. |
| 2565654–2572780 ms, 7,126 giây | Trước/sau: chuỗi nhận dạng méo có vẻ là lời tiếng Anh trong bài nói về AI | Không thể kết luận pause hay mất capture; cần audio hoặc xác nhận người dùng. |

Hai gap dài đều **nằm ngoài** khoảng TXT tham chiếu 1226750–1701750 ms. TXT không thể xác minh hai gap đó. Trong khoảng đối chiếu này không có cảnh báo `capture_timeline_gap`; thiếu/sai từ vẫn có thể là lỗi STT hoặc capture chưa được báo, không có gap không chứng minh audio đầy đủ.

## 2. Sai khác quan sát được

| Mốc phiên | TXT tham chiếu | Transcript hiện tại | Nhận xét |
| --- | --- | --- | --- |
| 1226750–1236750 ms | `không khoa trương quần áo hàng hiệu không trang sức đắt tiền` | `KHÔNG KHOA CHƯƠNG HÀNG HIỆU KHÔNG` / `RẤT ĐẮT TIỀN` | Thiếu `quần áo`, khác/thiếu `trang sức`; cần nghe audio để xác nhận bên nào đúng. |
| 1241750–1246750 ms và nhiều vị trí sau | Các biến thể chứa `Luxury` | `CREA LASY`, `COYN LASURI`, `PI LASURI`, `KHOAI LASY` | Từ ngoại ngữ không ổn định; TXT cũng sai nên chưa xác định chính tả từ audio. |
| 1291750–1306750 ms | `xa xỉ Thầm Lặng`, `xuất hiện bởi trong bối cảnh` | `XA XỈM LẶNG`, `XUẤT HIỆN BỞI CẢNH` | Mất/nhầm từ tiếng Việt so với TXT. |
| 1356750–1361750 ms | `không phải không 1%` | `KHÔNG PHẨY KHÔNG MỘT PHẦN TRĂM` | Reference có dấu hiệu sai; không coi khác biệt này là lỗi model nếu chưa nghe. |
| 1366750–1376750 ms | `cố gắng ghen tị với bất kỳ ai` | `CỐ GẮNG` / `CŨNG GÂY ẤN TƯỢNG VỚI BẤT KỲ AI` | Hai bản khác nghĩa; không chọn một bên làm chuẩn tự động. |
| 1431750–1436750 ms | `18.000 tỷ đô la Mỹ`, `1.000 tỷ phú đô la` | `MƯỜI TÁM NGHÌN TỶ`, `MỘT NGHÌN TỶ PHÚ LA` | Có khác biệt nội dung/đơn vị; biểu diễn chữ và số cũng cần chuẩn hóa khi chấm. |
| 1446750–1456750 ms | `Burberry cho đến Dior` | `BƠBERY CHO ĐẾN` / `PO` | Tên riêng ngoại ngữ khác rõ rệt giữa hai bản. |
| 1471750–1476750 ms | `Âu money tiền cổ` | `OMANI TIỀN CỔ` | Cả hai cần kiểm chứng audio. |
| 1636750–1641750 ms | `giữ kín thu nhập cá nhân` | `GIỮ THU NHẬP CÁ NHÂN` | Thiếu `kín` so với TXT; ảnh hưởng ý nghĩa. |

Có lặp ở ranh giới cửa sổ: `CẢNH` (1256750 ms), `KHÓ` (1296750 ms), `LẠI` (1341750 ms), `NHÂN` (1381750 ms), `MỘT` (1406750 ms). Đây là dấu hiệu cần benchmark segmentation; chưa chứng minh người nói không lặp thật hoặc nguyên nhân duy nhất là cửa sổ 5 giây. Không xóa lặp bằng quy tắc text toàn cục.

## 3. Benchmark offline cùng audio — đã chạy

Nguồn: YouTube `csHNhew6nN4`, “Thế giới xoay: Quiet Luxury - Xa xỉ thầm lặng | VTV24”. Metadata: 483 giây, Opus stereo 48 kHz. File `artifacts/meeting-m1/benchmark-csHNhew6nN4-20261027-012548/source.webm`, SHA256 `217935b208fd42937b867cd12900af7ebb2377d0332d5f4f1969e748e439c456`. Giải mã PyAV local sang mono PCM16/16 kHz, thời lượng thực 482,6453 giây; không bật capture, không gửi cloud.

Chạy `scripts/benchmark_meeting_source.py`: 2 threads, Sherpa Việt int8 và Whisper base local hiện có (auto-language, beam 3, không vocabulary), toàn video để khớp phạm vi TXT. Kết quả và raw tại `artifacts/meeting-m1/comparison-csHNhew6nN4-20261027-01/`.

| Engine/window | Tổng decode | RTF | Decode P95/window | Bất đồng token với TXT | Bất đồng ký tự |
| --- | --- | --- | --- | --- | --- |
| Sherpa 5s | 7,032s | 0,01457 | 0,0806s | 12,17% | 9,36% |
| Sherpa 15s | 7,285s | 0,01509 | 0,2479s | 10,24% | 7,90% |
| Whisper 5s | 123,117s | 0,25509 | 1,4037s | 30,66% | 17,95% |
| Whisper 15s | 55,436s | 0,11486 | 1,7821s | 26,56% | 15,42% |

Load riêng: Sherpa 1,117s, Whisper 1,196s (không bảo đảm cold disk cache). Bảng là **bất đồng với TXT chưa hiệu đính, không phải độ chính xác thực**. Chuẩn hóa NFC/casefold và chỉ giữ token chữ/số, chưa chuẩn hóa số chữ/số Ả Rập. Music/intro có thể ảnh hưởng: Whisper 15s sinh chữ Trung Quốc ở đoạn 0–15s, Sherpa 5s có `Ừ` ở nhạc mở đầu. Whisper hiện tại không phải lựa chọn thay Sherpa được chứng minh tốt hơn trên mẫu này.

Sherpa direct 15–20s nhận được `QUẦN ÁO HÀNG HIỆU KHÔNG TRANG SỨC ĐẮT TIỀN`, trong khi bản live thiếu các từ này. Điều này cho thấy model có thể nhận ra chúng trên audio direct với alignment khác; chưa tách được ảnh hưởng chất lượng capture và biên cửa sổ. Sherpa 15s giảm bất đồng khoảng 1,94 điểm phần trăm nhưng vẫn sai từ ngoại ngữ, và tăng độ trễ chốt từ 5s lên 15s. Không đủ căn cứ tự đổi cấu hình live.

Queue mô hình từ thời gian decode các pass đều có wait tối đa 0; **không phải backlog capture thực** và chưa gồm phụ đề tạm/LLM.

### Replay 180 giây qua worker production — hoàn tất

Chạy tuần tự bằng `scripts/replay_meeting_source.py`, lấy 0–180s từ video, có cả Sherpa preview và final engine thật. Không bật mic/WASAPI; không có Node/SQLite/UI hoặc concurrent LLM.

| Engine final | Exit | Capture queue peak | Overflow/gap/error | Final age P50 / P95 / max | RAM đỉnh lấy mẫu |
| --- | --- | --- | --- | --- | --- |
| Sherpa | 0 | 2 frames | 0 / 0 / 0 | 0,062 / 0,094 / 0,109s | 249,23 MiB |
| Whisper | 0 | 2 frames | 0 / 0 / 0 | 1,188 / 2,005 / 2,594s | 583 MiB |

Final age đo từ cuối cửa sổ audio đến lúc worker emit, **không tính thời gian gom cửa sổ 5s**. RAM lấy mẫu mỗi giây, không phải peak tuyệt đối. Cả hai có stopped marker; Sherpa 35 finals / 324 partials, Whisper 34 finals / 247 partials; khác số final không tự đồng nghĩa mất frame vì engine có thể trả text rỗng.

**Toàn bộ 35 final Sherpa giống hệt text và biên timestamp của offline 5s trên cùng 180s.** Không tái hiện lỗi mất từ do scheduling/preview/worker với file replay này; không loại trừ lỗi WASAPI hoặc source/output của phiên thật. Report: `replay-sherpa.json`, `replay-whisper.json` trong thư mục kết quả.

### Thử độ nhạy biên cửa sổ — hoàn tất

Giữ cùng Sherpa/model/audio/5s; dịch vị trí biên 0,5s, 1s, 2,5s, không bỏ audio đầu/cuối. Mức bất đồng token tương ứng **12,17% / 11,73% / 12,01%** so với baseline 12,17%. `alignment.json` giữ raw và timestamp mỗi pass. Biên cắt có ảnh hưởng nhưng chưa giải thích được mọi lỗi hoặc chứng minh một offset cố định có ích tổng quát. Không chọn offset theo mẫu này để đưa vào production.

Các bước chất lượng còn cần:

1. Giữ nguyên audio/TXT gốc, chọn cùng đoạn 3–5 phút có Việt–Anh; ghi rõ offset video, sample rate, duration, hash và cấu hình/model.
2. Hiệu đính reference theo audio, giữ tên riêng/đơn vị/phủ định; báo riêng khác biệt chính tả và chuẩn hóa số. Đo WER/CER sau khi reference đạt yêu cầu, không gọi điểm so với TXT thô là độ chính xác thực.
3. Chạy Sherpa và Whisper local sẵn có trên cùng PCM16/16 kHz, 2 threads, baseline cửa sổ 5 giây. Đo cold load riêng, decode từng cửa sổ, RTF và P50/P95; kiểm tra tên ngoại ngữ, câu ngắn, số và phủ định.
4. Replay-paced cùng dữ liệu, ghi audio age/queue peak/backlog và RAM. Benchmark offline tổng thời gian decode không thay phép đo backlog runtime. Script có sẵn `scripts/benchmark_meeting_multilingual.py` mới đo decode/RTF trên cửa sổ 5 giây, chưa đủ chứng minh backlog hay quality.

## A/B system audio thật — 27/10/2026

Người dùng cho phép system capture. Đã phát đoạn video 10–190s từ WAV local bằng winsound, thu `Speakers (Realtek(R) Audio) [Loopback]` stereo 48 kHz; không mở mic. Dữ liệu riêng: `artifacts/meeting-m1/system-ab-csHNhew6nN4-20261027-01/`. Không sửa raw/source hay DB.

- 180s: **0 queue overflow, 0 backend status lỗi, không callback timeline gap**. Đây là script A/B độc lập, không thay kiểm chứng worker/backend/UI toàn pipeline.
- Report đầu căn coarse 1ms theo một offset: bất đồng capture/direct **4,43% token**, chỉ 11/36 cửa sổ giống hệt, waveform correlation 0,0067. **Không dùng các số này để kết luận capture lỗi**, vì căn chỉnh chưa hợp lệ.
- Kiểm tra offline bổ sung: RMS envelope 10ms có correlation **0,9617**, độ trễ envelope khoảng **100ms**. RMS capture ~9158 so với source ~3896; peak capture 32330 so với source 17514. Có thay đổi mức audio qua đường phát/thu; chưa xác định do volume/DSP nào, không tự đổi thiết lập Windows.
- Các checkpoint waveform 2s tại video-relative excerpt seconds 10/60/120/170 có lag 1703/1669/1642/1622 samples, trị tuyệt đối correlation ~0,58–0,61. Fit thăm dò: delay đầu ~106,50ms, drift ~−31,21ppm. Full waveform correlation sau fit vẫn thấp, nên **chưa coi affine alignment là waveform match đã xác minh**.
- Tạo bản dẫn xuất bù drift, chỉ so **175s** để tránh tail; raw 180s vẫn giữ nguyên. Sherpa bất đồng capture/direct **1,81% token**, 25/35 cửa sổ giống hệt (`drift-pair-score.json`). Phạm vi khác report đầu nên không gọi mức giảm này là cải thiện capture hoặc độ chính xác; nó chỉ cho thấy kết quả A/B nhạy với căn chỉnh.
- Kết luận: không tái hiện gap/overflow trong lượt này; chưa đủ bằng chứng sửa production capture, resampler, engine hoặc dedup. Bản so nguồn trực tiếp đã có lỗi ngoại ngữ nên không thể giải quyết hết bằng capture. Cần reference nghe/hiệu đính và alignment theo block đáng tin cậy trước khi chấm lỗi còn lại.

## Thử decoder và thay đổi nhỏ — 27/10/2026

Dùng `scripts/benchmark_meeting_decoder.py`, giữ 2 threads/cửa sổ 5s, không tải model:

| Phép thử | Quiet Luxury bất đồng token / ký tự | Decode tổng / P95 |
| --- | --- | --- |
| Greedy baseline | 12,17% / 9,36% | 7,032s / 0,0806s |
| Modified beam 4 paths | 11,90% / 9,31% | 8,260s / 0,0947s |
| Greedy + 300ms zero tail | 12,56% / 9,82% | 7,366s / 0,0807s |
| Whisper ép language vi | 32,76% / 19,75% | 67,849s / 0,7144s |

Đối chứng thứ hai `V2Rj-tplz0Y`, 120,06s audio direct/reference ASR đã có: greedy token 16,20%, ký tự 9,36%; beam4 token 15,99%, ký tự 9,50%; P95 0,0784s → 0,1028s. **Cải thiện token nhỏ trên cả hai mẫu, ký tự mẫu hai hơi xấu hơn; reference chưa hiệu đính nên không bảo đảm tăng độ chính xác thật.** Không áp dụng zero-tail hoặc ép Whisper vi.

Runtime `server/python/meeting_worker.py`: chuyển Sherpa sang `modified_beam_search`, `max_active_paths=4`, giữ model/5s/raw. Test mock kiểm tra đúng cấu hình; **13 worker tests, 16 M0 tests, lint và typecheck PASS**. Lần benchmark mẫu hai đầu tiên lỗi ONNX vì tail 60ms; đã pad tối thiểu 100ms đúng worker production, chạy lại thành công. Replay beam4 180s có preview đã khởi chạy; chưa ghi nhận PASS trước khi report hoàn tất. Kết quả offline: `decoder-comparison.json`, `decoder-padding-comparison.json`, và mẫu hai `decoder-validation.json`.

## 4. Quyết định sửa runtime

**Giữ model Sherpa và cửa sổ live 5s; chuyển decoder từ greedy sang modified beam search 4 paths sau đối chứng dưới đây; chưa thêm overlap hoặc dedup.** Whisper hiện tại chậm hơn/kém hơn theo TXT; cửa sổ 15s chỉ cải thiện mức bất đồng trên một mẫu và tăng latency. Thay decoder chỉ có cải thiện token nhỏ, không khắc phục toàn bộ thiếu/sai từ. Nếu Whisper cải thiện quality nhưng không theo kịp realtime, không tự bật làm mặc định. Nếu benchmark cho thấy lỗi tập trung ở biên cửa sổ, mới thử segmentation/endpointing trên cùng mẫu và kiểm tra không mất/nhân đôi câu thật. Giữ `text_raw` để đối chứng, không thay tên riêng hoặc khôi phục từ thiếu bằng suy đoán.

Đợt offline/replay không thu âm. Đợt A/B tiếp theo đã thu system audio 180s theo sự cho phép của người dùng, không mở mic, không gọi cloud và không sửa transcript/DB của người dùng. Script A/B đã thêm cờ `alignment_validated: false` và cảnh báo phải kiểm tra drift/tail trước khi diễn giải điểm bất đồng.
