# Bộ test case — VietLearn AI Lab (WorkNote)

> **Danh mục kịch bản, không phải báo cáo tất cả đã Pass.** Lập từ 26/09/2026; endpoint, giới hạn, model và kỳ vọng cần đối chiếu mã trước khi chạy. Baseline mới: [verification.md](verification.md). Tutor cần model/runtime; semantic test có thể pass qua keyword fallback.

| Mục | Giá trị |
| --- | --- |
| Phiên bản code bám theo | Multi-provider Phase 1 (process-file / transcribe / PII / orchestrator) + toàn bộ 8 tab UI |
| Ngày lập | 2026-09-26 |
| Cách chạy auto hiện có | `pnpm test` → `tsc --noEmit` + `tsx --test server/tests/*.test.ts` |

**Mức ưu tiên**

| Mức | Ý nghĩa |
| --- | --- |
| P0 | Chặn phát hành: mất dữ liệu, crash app, sai pipeline file/AI, lộ key |
| P1 | Sai chức năng chính của một tab |
| P2 | UX, biên, tương thích, hồi quy nhỏ |

**Loại**

| Ký hiệu | Ý nghĩa |
| --- | --- |
| Auto | Đã có hoặc nên có unit/integration trong `server/tests/` |
| Manual | Cần trình duyệt / file thật / API key |
| API | Gọi HTTP/WS trực tiếp (curl / REST client) |

Kết quả chuẩn: **Pass / Fail / Blocked** (Blocked = thiếu key hoặc môi trường).

Smoke P0 trước khi merge: **NAV-01, LIB-01, LIB-02, LIB-07, LIB-14, STT-01, CHAT-01, MM-01, NFR-01, NFR-05**.

---

## Ma trận provider (bắt buộc với mọi test AI)

Ghi rõ bộ key khi chạy. Logic trong `getAvailableProviders()`:

| hasStt | Groq **hoặc** Gemini |
| hasLlm | Gemini **hoặc** OpenRouter |
| hasVision | **chỉ** Gemini |
| hasAny | Gemini **hoặc** Groq **hoặc** OpenRouter |

| ID | Gemini | Groq | OpenRouter | File / API | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| PRV-01 | không | không | không | Mọi AI | Banner demo; process-file trả `isDemo: true`; chat demo |
| PRV-02 | không | có | không | MP3 process-file | STT thành công; summary giải thích thiếu LLM; `quiz=[]`; **không** demo giả |
| PRV-03 | không | có | không | PDF/DOCX | HTTP 400: cần Gemini hoặc OpenRouter |
| PRV-04 | không | có | không | PNG | HTTP 400: cần Gemini cho ảnh |
| PRV-05 | không | không | có | PDF text / DOCX | Phân tích qua OpenRouter + `looseParseJson` |
| PRV-06 | không | không | có | MP3 | 400: thiếu STT key |
| PRV-07 | không | không | có | PNG / PDF scan | 400: thiếu Gemini vision |
| PRV-08 | có | không | không | Mọi loại hỗ trợ | Gemini (text / Files API / inline ảnh) |
| PRV-09 | có | có | không | MP3 ≤ 24MB | Groq Whisper rồi Gemini schema |
| PRV-10 | có | có | không | MP4 hoặc audio > 24MB | **Không** Groq; Gemini Files API |
| PRV-11 | có | có | có | Gemini giả lập 429 | OpenRouter theo `OPENROUTER_MODELS`; parse fail → model kế |
| PRV-12 | có (sai key) | có | có | process-file text | Không kẹt retry 429 dài; fallback OpenRouter |

`/api/chat` probe (`messages: []`) hiện `isDemo: !hasApiKey()` — **chỉ Gemini**. Banner có thể sai khi chỉ có Groq/OpenRouter (CHAT-08).

---

## 0. Khung app, điều hướng, lưu trữ

| ID | Tên | P | Loại | Tiền điều kiện | Các bước | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- | --- |
| NAV-01 | Mở app, 8 tab | P0 | Manual | `pnpm run dev` | Vào trang chủ, lần lượt Library, Chatbot, NotebookLM, Mind Maps, RPG, Audio Lab, Knowledge, Spending | Mỗi tab render, không trắng màn, không uncaught error |
| NAV-02 | Sidebar mobile | P1 | Manual | Viewport &lt; `lg` | Mở menu, chọn tab, đóng overlay | Tab đổi; overlay đóng |
| NAV-03 | ErrorBoundary | P1 | Manual | — | Gây lỗi render (nếu có nút dev) hoặc inject throw | UI lỗi thân thiện, không trắng toàn app |
| NAV-04 | Reload giữ thư viện | P0 | Manual | Đã upload file success | F5 | File còn trong IndexedDB; audio/video phát lại được (`objectUrl` hydrate) |
| NAV-05 | Xóa file | P1 | Manual | Có file | Xóa 1 file | Mất khỏi list; IndexedDB xóa; active file chuyển hợp lý |
| NAV-06 | Hồ sơ cá nhân | P1 | Manual | — | Settings: tên, avatar | Lưu `localStorage`; avatar hiện trên header |
| NAV-07 | Ô Search / Bell | P2 | Manual | — | Click | Hiện chưa có backend: không crash |
| NAV-08 | Banner demo | P0 | Manual | Không key / chỉ Groq | Mở app | Banner hiện khi không Gemini; icon tia chớp phản ánh status (đối chiếu CHAT-08) |
| NAV-09 | Đa tab cùng Library | P2 | Manual | Mở app 2 tab | Upload file ở tab A | Tab B không crash khi đọc IndexedDB; không nhất thiết auto-sync nhưng không lỗi dữ liệu khi cả 2 tab cùng sửa |
| NAV-10 | Spam đổi tab khi đang xử lý | P2 | Manual | File đang processing | Click liên tục qua nhiều tab trong lúc chờ AI | Không hủy ngầm request; không leak listener; kết quả vẫn trả về đúng file gốc |
---

## 1. Library — upload & `/api/process-file`

### 1.1. Giao diện upload

| ID | Tên | P | Loại | Các bước | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| LIB-01 | Kéo thả PDF | P0 | Manual | Drop PDF text vào Library | Multipart (không Base64 JSON với file mới); status processing → success; có summary, quiz, mindmap, extractedText |
| LIB-02 | Chọn file input | P0 | Manual | Chọn DOCX | Như LIB-01 |
| LIB-03 | Định dạng không hỗ trợ UI | P1 | Manual | Chọn `.exe` / `.zip` nếu input chặn | Input `accept` lọc; nếu lách được, server lỗi rõ |
| LIB-04 | File vượt `MAX_FILE_SIZE_MB` (mặc định 50) | P0 | Manual/API | Upload &gt; limit | HTTP 413 JSON `File too large. Max size is …` |
| LIB-05 | Thanh tiến trình | P1 | Manual | Upload file vừa | Có %/stage; không kẹt 97% sau khi API xong; lỗi thì dừng + `errorMsg` |
| LIB-06 | Chọn file active | P1 | Manual | Nhiều file | Chat/Mindmap/Game/Video Lab dùng đúng file đang chọn |
| LIB-07 | Retry file lỗi | P1 | Manual | File error | Retry gọi lại pipeline; không nhân bản file |
| LIB-08 | Preview tóm tắt Markdown / raw | P2 | Manual | File success | Đổi preview/raw; Copy hoạt động |
| LIB-09 | Dịch tóm tắt | P1 | Manual | File success, chọn ngôn ngữ | Gọi `/api/translate`; nội dung đổi; TTS đọc được nếu có |

### 1.2. Extractor theo loại file

| ID | Tên | P | Loại | Input | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| LIB-10 | TXT/MD/CSV UTF-8 | P0 | Auto/Manual | File tiếng Việt | Text local; không gửi nhị phân Gemini |
| LIB-11 | HTML strip script | P0 | Auto | Có sẵn `multiProvider.test.ts` | Không còn `<script>` / `alert` |
| LIB-12 | DOCX mammoth | P0 | Manual | DOCX có heading/list | `extractedText` khớp nội dung; quiz/mindmap từ text |
| LIB-13 | XLSX nhiều sheet | P1 | Manual | 2+ sheet | Text có `--- Bảng: {tên} ---` |
| LIB-14 | PDF có text layer | P0 | Manual | Giáo trình text | Parse local; log không “PDF scan”; LLM nhận text đã mask |
| LIB-15 | PDF scan (ảnh, &gt;50KB, &lt;100 ký tự) | P0 | Manual | Slide scan | `isScannedPdf`; **bắt buộc Gemini**; Files API; có OCR trong summary |
| LIB-16 | PDF scan không Gemini | P0 | Manual | PRV-03/07 | 400 rõ ràng |
| LIB-17 | PDF parse lỗi | P1 | Manual | PDF hỏng | Coi như scan → Gemini nếu có key |
| LIB-18 | Ảnh ≤ 10MB | P0 | Manual | JPG/PNG/WEBP | 1-hop Gemini `inlineData` + schema |
| LIB-19 | Ảnh &gt; 10MB | P1 | Manual | PNG lớn | Gemini Files API; xóa file cloud sau cùng |
| LIB-20 | Ảnh không Gemini | P0 | API | Chỉ OpenRouter | 400 vision |
| LIB-21 | MP3 ≤ 24MB + Groq | P0 | Manual | Bài giảng ngắn | Binary multipart Groq; transcript → PII → LLM; **không** 413 Base64 |
| LIB-22 | MP3 &gt; 24MB | P0 | Manual | File ~30MB | Bỏ Groq; Gemini Files; poll ACTIVE; delete |
| LIB-23 | WAV/M4A/OGG | P1 | Manual | Từng loại | STT + analysis hoặc lỗi MIME rõ |
| LIB-24 | MP4 video | P0 | Manual | Video nói chuyện | Không Groq; Gemini Files STT rồi LLM nếu có hasLlm |
| LIB-25 | Groq-only MP3 | P0 | Manual | PRV-02 | Transcript đầy đủ; không crash schema |
| LIB-26 | Nhánh JSON base64 legacy | P2 | API | POST `{ name, mimeType, base64Data }` nhỏ | Ghi disk rồi cùng pipeline; `finally` xóa temp |
| LIB-27 | Thiếu payload | P0 | API | POST không file, không base64 | 400 |
| LIB-28 | Xóa file tạm | P0 | Manual | Mọi nhánh (success/lỗi) | `uploads/` không đọng file `file-*` / `b64-*` |
| LIB-29 | MIME lệch extension | P1 | Manual | `.mp3` + mime octet-stream | `normalizeMimeType` ưu tiên ext |
| LIB-30 | PII trong tài liệu | P0 | Manual | TXT có email + SĐT | LLM không thấy PII thô (log/prompt); UI `extractedText` **unmask** đầy đủ |
| LIB-31 | `unmaskDeep` quiz/mindmap | P0 | Auto | `piiGuard.test.ts` | Không còn token `__PII_` trong object |
| LIB-32 | Output schema frontend | P0 | Manual | Mọi success | `summary` string, `quiz[]`, `mindmap` có `id`/`label`; thiếu field thì `normalizeAnalysis` |
| LIB-33 | Tên file Unicode/emoji | P1 | Manual | `bài giảng #1 (v2)😀.pdf` | Lưu, hiển thị, xóa đúng; multipart không lỗi encode |
| LIB-34 | Tên file rất dài (&gt;200 ký tự) | P2 | Manual | Rename file dài | UI không vỡ; server không lỗi filesystem |
| LIB-35 | File 0 byte | P0 | Manual/API | File rỗng | Lỗi rõ ràng, không treo pipeline |
| LIB-36 | Upload nhiều file song song | P0 | Manual | 3-5 file cùng lúc qua UI | Mỗi file có state riêng; không lẫn kết quả (file A không nhận summary của file B) |
| LIB-37 | Hủy giữa chừng | P1 | Manual | Đóng tab/tắt mạng khi đang upload | Request abort; không tạo file "orphan" trong IndexedDB hoặc `uploads/` |
| LIB-38 | Đổi extension giả | P1 | Manual | File `.txt` đổi tên thành `.pdf` | Lỗi parse rõ ràng (không dựa 100% vào extension để tin nội dung), không crash server |
| LIB-39 | Upload trùng tên 2 lần | P2 | Manual | Cùng tên file, upload lại | Xác nhận hành vi nhất quán: tạo bản mới độc lập hoặc thay thế — không lẫn 2 bản |
| LIB-40 | IndexedDB quota đầy | P1 | Manual | Storage gần đầy (DevTools giả lập) | UI báo lỗi thân thiện, không crash toàn app |
| LIB-41 | Tài liệu rất dài (&gt;50 trang) | P1 | Manual | PDF text nhiều trang | Server chunk/cắt hợp lý; không 500 vì vượt token limit LLM |
| LIB-42 | File ngôn ngữ khác (English/Chinese) | P2 | Manual | Tài liệu tiếng Anh | Xác nhận hành vi: output theo tiếng Việt (theo thiết kế app) hay giữ ngôn ngữ gốc |

### 1.3. Link — `/api/process-link`

| ID | Tên | P | Loại | Các bước | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| LNK-01 | URL không http | P0 | API | `"ftp://..."` / rỗng | 400 |
| LNK-02 | YouTube watch/youtu.be/shorts | P0 | Manual | Dán link public có caption | Transcript + summary/quiz/mindmap tiếng Việt |
| LNK-03 | YouTube không caption | P1 | Manual | Video tắt phụ đề | Fallback Gemini xem video hoặc lỗi rõ, không treo vô hạn |
| LNK-04 | SoundCloud/Spotify/TikTok/FB/IG/X | P1 | API | Từng domain | 400: chỉ YT hoặc file trực tiếp |
| LNK-05 | Google Drive file/d/ID | P1 | Manual | Link share public | Đổi `uc?export=download`; tải ≤ max size |
| LNK-06 | Dropbox dl=0 | P2 | Manual | Link public | Đổi dl=1 / dl.dropboxusercontent |
| LNK-07 | File URL chậm &gt; 15s | P0 | API | URL treo | Abort; lỗi timeout |
| LNK-08 | File URL &gt; max size | P0 | API | Content-Length lớn | Từ chối, không ngốn RAM |
| LNK-09 | Demo không Gemini | P1 | Manual | Không key | `isDemo` mock, không crash |
| LNK-10 | Redirect chain dài | P1 | API | URL có &gt;10 lần redirect 30x | Có giới hạn số lần redirect; không loop vô hạn |
| LNK-11 | URL trả 200 nhưng nội dung là trang lỗi | P2 | API | Link chết nhưng server trả HTML "404 page" với status 200 | Không coi nội dung rác là file hợp lệ; xử lý hoặc báo lỗi hợp lý |

---

## 2. Video Lab & `/api/transcribe`

| ID | Tên | P | Loại | Các bước | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| STT-01 | Upload video: FormData | P0 | Manual | File MP4/MP3, bấm phiên âm AI | **Không** `fileToBase64`; multipart `file`; `{ lang, segments[{start,dur,text}] }` |
| STT-02 | Groq timed `verbose_json` | P0 | Manual | Audio ≤ 24MB, có Groq | `dur ≈ end - start` (≥ 0.5); `start` tăng dần |
| STT-03 | Video / file lớn | P0 | Manual | MP4 | Gemini Files + schema timed; không Groq |
| STT-04 | Backward JSON base64 nhỏ | P2 | API | `{ base64Data }` | Vẫn chạy; ghi disk; xóa temp |
| STT-05 | Thiếu STT key | P0 | API | Không Groq/Gemini | 400 |
| STT-06 | Audio không lời | P1 | Manual | Nhạc không lời | 400 hoặc segments rỗng được báo lỗi |
| STT-07 | YouTube trong Lab | P0 | Manual | File từ process-link YT | Cue từ `/api/youtube-transcript`; không bắt buộc STT lại |
| STT-08 | YouTube không cue | P1 | Manual | — | `capState=none`; fallback chia `extractedText` |
| STT-09 | Đổi file reset AI cues | P1 | Manual | Transcribe xong, chọn file khác | `aiCues` reset |
| STT-10 | Cue đồng bộ player | P1 | Manual | Play video | Highlight đúng segment theo thời gian |
| STT-11 | Audio nhiều người nói / noise lớn | P2 | Manual | File có overlap giọng nói | Không crash; chất lượng transcript ghi nhận để tham khảo (không P0) |
| STT-12 | Đóng tab giữa lúc phiên âm | P1 | Manual | Đang gọi Gemini Files, đóng browser | Không leak file trên Gemini Files (server vẫn cleanup ở `finally`) |

Tính `dur` (unit): `multiProvider.test.ts`.

---

## 3. Chatbot — `/api/chat`

| ID | Tên | P | Loại | Các bước | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| CHAT-01 | Hỏi theo tài liệu active | P0 | Manual | Có extractedText, hỏi nội dung | Trả lời tiếng Việt, bám context |
| CHAT-02 | Không chọn file | P1 | Manual | Chat không context | Không crash; trả lời generic / demo |
| CHAT-03 | Chip tóm tắt / dịch / phát âm 3 miền / quiz | P1 | Manual | 4 chip | Đúng prompt; có phản hồi |
| CHAT-04 | Không dấu | P2 | Manual | “tom tat bai nay” | Vẫn hiểu intent |
| CHAT-05 | Session localStorage | P1 | Manual | Chat, F5 | Lịch sử session còn |
| CHAT-06 | Demo không Gemini | P1 | Manual | — | Reply demo nhắc cấu hình key |
| CHAT-07 | messages không phải array | P0 | API | `{}` | 400 |
| CHAT-08 | Probe status | P0 | API | `{ messages: [] }` | 200 `{ success, isDemo }`; **isDemo chỉ theo Gemini** — fail nếu kỳ vọng Groq/OpenRouter tắt banner |
| CHAT-09 | Full-bleed layout | P2 | Manual | Tab chat | Không header thừa, cuộn hội thoại ổn |
| CHAT-10 | Message vượt token limit | P1 | Manual/API | Dán văn bản rất dài vào chat | Lỗi rõ ràng, không crash server |
| CHAT-11 | Double-submit / giữ Enter | P1 | Manual | Gửi liên tiếp nhanh nhiều message | Không tạo request trùng; UI không hiện message lặp |
| CHAT-12 | XSS trong nội dung chat | P0 | Manual | Gửi `<script>alert(1)</script>` | Render an toàn (escape); script không thực thi |

---

## 4. NotebookLM

API: `GET/POST/PUT/DELETE /api/notebook/pages`, sources, upload, search, chat, summary, quiz.

| ID | Tên | P | Loại | Các bước | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| NB-01 | Tạo/sửa/xóa page | P0 | Auto/Manual | CRUD title/content | Đúng store; title rỗng bị reject (`notebook.test.ts`) |
| NB-02 | Source type hợp lệ | P0 | Auto | text/url/file | `validateSourceInput` |
| NB-03 | Source type invalid | P0 | Auto | `type: invalid` | Lỗi |
| NB-04 | tokenCount | P1 | Auto | Tạo source | `tokenCount > 0` |
| NB-05 | Context page + sources | P0 | Auto | `buildNotebookContext` | Gộp title + nội dung nguồn |
| NB-06 | Upload nguồn file | P0 | Manual | PDF/DOCX | Source có content; file tạm xóa |
| NB-07 | Search keyword | P0 | Auto | 2 nguồn khác chủ đề | Nguồn đúng rank cao hơn (`searchSources`) |
| NB-08 | Search semantic HF | P1 | Auto | `embedServiceSemantic.test.ts` | Query đồng nghĩa tiếng Việt rank đúng; query rỗng → `[]` |
| NB-09 | Semantic Python fail | P1 | Manual | Tắt `.venv` / timeout | Fallback bag-of-words, chat không 500 |
| NB-10 | Chat notebook | P0 | Manual | Có nguồn, hỏi | Trả lời + trích nguồn; demo nếu không Gemini |
| NB-11 | Summary / quiz notebook | P0 | Manual | Có nội dung | Markdown summary; quiz cấu trúc đúng |
| NB-12 | Xóa source đang gắn page | P1 | Manual | — | Không vỡ page; context bỏ nguồn |
| NB-13 | Heavy rate limit | P1 | API | 11 lần chat/5 phút | Thông báo heavy limiter |
| NB-14 | Xóa page khi AI đang trả lời | P1 | Manual | Hỏi AI, xóa page ngay khi đang loading | Không crash; không ghi kết quả vào page đã xóa |
| NB-15 | Nhiều page cùng tên | P2 | Manual | Tạo 2 page tên giống nhau | Phân biệt bằng id; context không bị lẫn |

---

## 5. Mind map

| ID | Tên | P | Loại | Các bước | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| MM-01 | Render từ file AI | P0 | Manual | File success có mindmap 3 tầng | Cây đủ nhánh, không node `{}` |
| MM-02 | Expand/collapse | P1 | Manual | Click node | Con ẩn/hiện |
| MM-03 | Sửa nhãn | P1 | Manual | Đổi label | State file cập nhật; reload IndexedDB còn nếu persist mindmap |
| MM-04 | Không có mindmap | P1 | Manual | File lỗi/demo | Root fallback, không crash viewer |
| MM-05 | JSON cắt cụt | P0 | Auto | `looseParseJson` truncated | Vá được; `normalizeAnalysis` bổ sung quiz/mindmap |
| MM-06 | Mindmap rất nhiều node (&gt;50) | P2 | Manual | File tạo mindmap lớn | Render không đứng UI; scroll/zoom vẫn dùng được |

---

## 6. RPG Games & lobby WS

| ID | Tên | P | Loại | Các bước | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| RPG-01 | Quiz từ file active | P0 | Manual | File có quiz, vào game | Câu hỏi đúng bộ quiz đó |
| RPG-02 | Không quiz | P1 | Manual | File Groq-only `quiz=[]` | Empty state / không crash canvas |
| RPG-03 | Trả lời đúng | P0 | Manual | Va chạm, chọn đúng | Qua chướng ngại, cộng điểm/EXP |
| RPG-04 | Trả lời sai | P0 | Manual | Chọn sai | Hiện explanation; trừ máu/điểm theo thiết kế |
| RPG-05 | Phím mũi tên / nút mobile | P1 | Manual | Desktop + hẹp | Nhân vật di chuyển |
| RPG-06 | Progress localStorage | P2 | Manual | Chơi, F5 | Tiến độ farm/lobby còn |
| RPG-07 | WS `/api/ws/lobby` | P1 | Manual | 2 tab cùng lobby | Join/leave; không 400 upgrade nhầm Vite HMR |
| RPG-08 | Tutor quiz-rpg (local) | P1 | Auto/API | `POST /api/tutor/quiz-rpg` | JSON scenario/options A–D hoặc `raw`; auto `tutor.test.ts` |
| RPG-09 | Reconnect WS sau mất mạng | P1 | Manual | Tắt/bật mạng khi đang trong lobby | Tự động rejoin hoặc báo lỗi rõ; không kẹt "connecting" vô hạn |
| RPG-10 | 2 người trả lời cùng lúc | P2 | Manual | 2 tab cùng lobby, trả lời đồng thời | State không lệch giữa 2 client |

---

## 7. Audio Lab

| ID | Tên | P | Loại | Các bước | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| AUD-01 | TTS Bắc/Trung/Nam | P0 | Manual | Nhập chữ, 3 giọng | `/api/tts`; audio phát; voice map Kore/Fenrir/Zephyr |
| AUD-02 | TTS demo | P1 | Manual | Không Gemini | `isDemo`, không crash |
| AUD-03 | TTS rỗng | P1 | API | text rỗng | 400 |
| AUD-04 | TTS-read đoạn dài | P1 | Manual | ReadAloud trên tóm tắt | `/api/tts-read` ghép đoạn, phát hết |
| AUD-05 | Live translate mic HTTP | P0 | Manual | Mic, 6s chunk, chọn ngôn ngữ | `/api/translate-live-audio`: gốc + bản dịch |
| AUD-06 | Live translate WS | P1 | Manual | `/api/ws/translate` | Stream không cắt kết nối ngay |
| AUD-07 | Từ chối quyền mic | P1 | Manual | Block mic | Lỗi rõ, không treo “recording” |
| AUD-08 | Ngôn ngữ không hỗ trợ | P2 | API | `lang: xx` | 400 hoặc fallback |
| AUD-09 | Heavy limit live audio | P1 | API | &gt;10 req/5 phút | JSON limiter |
| AUD-10 | Đổi giọng khi đang phát | P1 | Manual | Đang nghe TTS, đổi voice giữa chừng | Dừng audio cũ, phát audio mới; không chồng tiếng |
| AUD-11 | Mic bị app khác chiếm dụng | P2 | Manual | Mic đang dùng ở app khác | Lỗi rõ ràng, không treo trạng thái "recording" |

---

## 8. Dịch thuật & phụ đề

| ID | Tên | P | Loại | Các bước | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| TR-01 | `/api/translate` | P0 | Manual | Đoạn tiếng Việt → en/ja/ko/zh/fr | Giữ cấu trúc markdown/list nếu prompt yêu cầu |
| TR-02 | Translate demo | P1 | Manual | Không Gemini | Mock `isDemo` |
| TR-03 | `/api/subtitle-translate` | P1 | Manual | Mảng cue | Dịch không bắt buộc Gemini (free MT) |
| TR-04 | `/api/youtube-transcript` | P0 | API | URL YT có caption | `{ success, lang, segments }` timed |
| TR-05 | YT không transcript | P1 | API | Video tắt caption | 400/empty rõ, không 500 nuốt lỗi |
| TR-06 | Dịch văn bản có code/công thức | P2 | Manual | Đoạn có code block hoặc công thức toán | Giữ nguyên phần không cần dịch nếu prompt yêu cầu |
---

## 9. Knowledge Hub

| ID | Tên | P | Loại | Các bước | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| KB-01 | 8 chuyên đề tĩnh | P1 | Manual | Mở từng topic | Lý thuyết + diagram; không gọi Gemini bắt buộc |
| KB-02 | Lưu `vietlearn_files` | P2 | Manual | Tương tác nếu có | localStorage không đè IndexedDB thư viện chính |

---

## 10. Sổ chi tiêu

| ID | Tên | P | Loại | Các bước | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| BD-01 | Thêm giao dịch | P0 | Manual | Số tiền, danh mục, ngày | List + chart Recharts cập nhật |
| BD-02 | Sửa / xóa | P1 | Manual | — | localStorage `vietlearn_transactions` khớp |
| BD-03 | Mục tiêu tiết kiệm | P1 | Manual | Tạo goal | `vietlearn_saving_goals`; tiến độ đúng |
| BD-04 | Màu danh mục | P2 | Manual | Đổi màu | `vietlearn_category_colors` |
| BD-05 | Reload | P0 | Manual | F5 | Dữ liệu còn; chart không NaN |
| BD-06 | Input âm / chữ | P1 | Manual | `-1`, `abc` | Validate, không vỡ chart |
| BD-07 | Offline (không AI) | P0 | Manual | Không key | Tab vẫn dùng bình thường || PII-12 | Nhiều loại PII liên tiếp trong 1 câu | P0 | Auto | "Anh Nam, sdt 090xxx, email a@b.com, CCCD 001..." | Mask hết, không chỉ mask token đầu tiên |
| PII-13 | Dữ liệu giống PII nhưng không hợp lệ | P1 | Auto | Số 3 chữ số dạng "123" | Không mask nhầm dữ liệu thường |
| BD-08 | Ngày giao dịch cực đoan (rất xa quá khứ/tương lai) | P2 | Manual | Nhập ngày 1990 hoặc 2099 | Chart group theo tháng vẫn đúng, không NaN |
| BD-09 | Số tiền rất lớn | P2 | Manual | Nhập 999,999,999,999 | Không lỗi hiển thị/overflow chart |
| BD-10 | Đổi múi giờ hệ thống | P1 | Manual | Đổi timezone máy, nhập giao dịch | Ngày không bị lệch do quy đổi UTC |

---

## 11. Privacy API & PII

| ID | Tên | P | Loại | Input | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| PII-01 | Email + SĐT VN | P0 | Auto | `piiGuard.test.ts` | Token + unmask đúng |
| PII-02 | CCCD + STK | P0 | Auto | — | Mask/unmask |
| PII-03 | Họ tên ngữ cảnh | P0 | Auto | “Họ và tên: …” | Mask tên |
| PII-04 | Trùng giá trị | P0 | Auto | Email lặp | 1 token, 2 chỗ |
| PII-05 | unmaskDeep | P0 | Auto | Object lồng | Hết `__PII_` |
| PII-06 | Text rỗng | P0 | Auto | `""` | vault rỗng, không throw |
| PII-07 | POST `/api/privacy/anonymize` | P1 | API | `{ text }` | `{ success, data }` |
| PII-08 | anonymize không string | P0 | API | `{ text: 1 }` | 400 |
| PII-09 | POST `/api/privacy/restore` | P1 | API | masked + vault | Text gốc |
| PII-10 | Secret key pattern | P2 | Manual | `sk-...` / `AIza...` | Mask; **không log** plaintext |
| PII-11 | Audio bytes | P2 | Manual | — | PII **không** che file gửi Groq (giới hạn đã biết) |
| PII-12 | Nhiều loại PII liên tiếp trong 1 câu | P0 | Auto | "Anh Nam, sdt 090xxx, email a@b.com, CCCD 001..." | Mask hết, không chỉ mask token đầu tiên |
| PII-13 | Dữ liệu giống PII nhưng không hợp lệ | P1 | Auto | Số 3 chữ số dạng "123" | Không mask nhầm dữ liệu thường |

---

## 12. Tutor local (Đội 3)

Cần `.venv` + model GGUF. Blocked nếu chưa nạp model.

| ID | Tên | P | Loại | Các bước | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| TUT-01 | Chat GGUF | P1 | Auto | `tutor.test.ts` | Reply chứa OK |
| TUT-02 | Summarize | P1 | Auto | — | Chuỗi không rỗng |
| TUT-03 | Quiz RPG JSON | P1 | Auto | — | A–D + exp hoặc raw |
| TUT-04 | API thiếu body | P0 | API | `{}` | 400 từng endpoint |
| TUT-05 | Timeout Python | P1 | Manual | Model chậm | 500 message rõ; không treo HTTP mãi |
| TUT-06 | Heavy limiter `/api/tutor` | P2 | API | Spam | 10/5 phút |

---

## 13. Gemini Files helper

| ID | Tên | P | Loại | Các bước | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| GF-01 | Upload → PROCESSING → ACTIVE | P0 | Manual | Audio/PDF scan | generateContent chỉ khi ACTIVE |
| GF-02 | Timeout poll | P1 | Manual | File cực lớn / mạng chậm | Lỗi tiếng Việt; không treo event loop |
| GF-03 | Delete trong finally | P0 | Manual | Success và fail | Không đọng file trên Gemini Files |
| GF-04 | MIME sai | P1 | Manual | Ext lệch | 400 friendlyGeminiError |

---

## 14. LLM orchestrator

| ID | Tên | P | Loại | Các bước | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| LLM-01 | Gemini + responseSchema | P0 | Manual | PDF text | Quiz 4 options; mindmap ≤ 3 tầng có children |
| LLM-02 | Gemini 429 → OpenRouter | P0 | Manual | Hết quota / mock 429 | Không retry dài; model trong `OPENROUTER_MODELS` |
| LLM-03 | OpenRouter JSON markdown | P1 | Manual | Model bọc \`\`\`json | `looseParseJson` lấy object |
| LLM-04 | Model 1 fail, model 2 ok | P0 | Manual | Model đầu 503 | Thử model kế |
| LLM-05 | Hết list OpenRouter | P0 | Manual | Mọi model fail | 500/400 tiếng Việt, không exception nuốt |
| LLM-06 | normalize khi thiếu quiz | P0 | Auto | `{ summary }` | quiz `[]`, mindmap root = filename |
| LLM-07 | Có key nhưng key sai format ở cả 3 provider | P1 | API | `GEMINI_API_KEY=sai`, tương tự Groq/OpenRouter | Phân biệt rõ "có key nhưng lỗi xác thực" với "không có key"; banner/lỗi phản ánh đúng, không hiểu nhầm demo mode |

---

## 15. Phi chức năng, bảo mật, hồi quy

| ID | Tên | P | Loại | Các bước | Kết quả mong đợi |
| --- | --- | --- | --- | --- | --- |
| NFR-01 | API key không lộ client | P0 | Manual | DevTools Network + localStorage | Không có `GEMINI_API_KEY` / Groq / OpenRouter trên browser |
| NFR-02 | Rate 150/phút `/api/` | P1 | API | Burst 151 | `{ error: "Bạn đã gửi quá nhiều yêu cầu..." }` |
| NFR-03 | Heavy 10/5 phút process-file | P0 | API | 11 upload | Heavy message |
| NFR-04 | Concurrency Gemini ≤ 3 | P1 | Manual | 5 process-file song song | Hàng đợi; ít 429 hơn bắn 5 cùng lúc |
| NFR-05 | `pnpm run lint` | P0 | Auto | — | `tsc --noEmit` 0 lỗi |
| NFR-06 | `pnpm test` | P0 | Auto | Có `.venv` cho semantic/tutor | Test hiện có pass; tutor/semantic **Blocked** nếu thiếu model |
| NFR-07 | Server start | P0 | Manual | `pnpm run dev` | Listen PORT; log WS 2 path |
| NFR-08 | express.json 50mb | P1 | API | JSON vừa &gt;50mb | 413; khuyến nghị multipart |
| NFR-09 | Responsive | P1 | Manual | 375px và 1280px | 8 tab dùng được; game có nút ảo |
| NFR-10 | Firebase optional | P2 | Manual | Thiếu `VITE_FIREBASE_*` | App chạy; sync cloud skip |
| NFR-11 | process-link SSRF cơ bản | P1 | API | `http://127.0.0.1:...` / metadata cloud | Ghi nhận hành vi (timeout/size); không crash server |
| NFR-12 | Log không in transcript dài | P2 | Manual | STT | Log cắt ngắn, không dump PII |
| NFR-13 | Stored XSS qua các input tự do | P0 | Manual | Nhập `<script>` vào tên hồ sơ (NAV-06), note giao dịch (BD), tiêu đề NotebookLM | Escape khi render ở mọi nơi hiển thị lại; script không thực thi |
| NFR-14 | Mất mạng giữa lúc xử lý file | P1 | Manual | DevTools → Offline khi file đang processing | Timeout rõ ràng; báo lỗi hoặc cho phép retry, không treo UI vô hạn |
| NFR-15 | Server restart giữa session | P1 | Manual | Restart `pnpm run dev` khi client đang mở WS | Client phát hiện mất kết nối và reconnect (RPG-07, AUD-06) hoặc báo lỗi rõ |
| NFR-16 | Leak object URL khi xóa file nhiều lần | P2 | Manual | Upload rồi xóa file audio/video liên tục 10+ lần | Không leak memory (theo dõi qua DevTools → Memory), `URL.revokeObjectURL` được gọi |

---

## 16. Test đã tự động hóa (map)

| File | Bao phủ gần đúng |
| --- | --- |
| `server/tests/piiGuard.test.ts` | PII-01…06, LIB-31 |
| `server/tests/multiProvider.test.ts` | PRV matrix type, LIB-11, MM-05, LLM-06, STT dur |
| `server/tests/notebook.test.ts` | NB-01…05, NB-07 |
| `server/tests/embedServiceSemantic.test.ts` | NB-08 |
| `server/tests/tutor.test.ts` | TUT-01…03 |

**Chưa có auto (nên bổ sung sau):** mock `fetch` Groq/OpenRouter; `extractDocumentText` PDF heuristic; `getAvailableProviders` với env giả; HTTP 400 ma trận PRV-02…07; multer 413; Gemini Files poll/delete.

---

## 17. Dữ liệu mẫu gợi ý

| Fixture | Mục đích |
| --- | --- |
| `sample-text.pdf` (text layer, vài trang) | LIB-14 |
| `sample-scan.pdf` (ảnh, &gt;50KB) | LIB-15 |
| `lecture.docx` | LIB-12 |
| `grades.xlsx` 2 sheet | LIB-13 |
| `note.txt` có email + 09x + CCCD | LIB-30 |
| `talk-5min.mp3` &lt; 10MB | LIB-21, STT-02 |
| `talk-long.mp3` &gt; 25MB | LIB-22 |
| `clip.mp4` có lời | LIB-24, STT-03 |
| `slide.png` | LIB-18 |
| YouTube public có CC tiếng Anh | LNK-02, TR-04 |

---

## 18. Checklist phiên test (1 vòng ~45–90 phút)

1. NFR-05, NFR-07, NAV-01.
2. PRV-01 (không key) → demo Library + Chat.
3. Bật Gemini: LIB-01 PDF, LIB-12 DOCX, LIB-18 ảnh, LNK-02 YouTube.
4. Thêm Groq: LIB-21 MP3 nhỏ, LIB-24 MP4, STT-01 FormData.
5. (Tuỳ chọn) Tắt Gemini, bật OpenRouter: PRV-05 PDF.
6. NB-01, NB-10, MM-01, RPG-01, AUD-01, BD-01, NFR-01.
7. Ghi Fail kèm: tab, file, bộ key, HTTP status, log server cắt 200 ký tự đầu.

Khi Fail P0: không merge. Khi Blocked vì thiếu key: ghi rõ, không tính Pass.
