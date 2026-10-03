# Checklist WorkNote — Portfolio

Cập nhật **03/10/2026**. Chi tiết ưu tiên và tiêu chí ở [roadmap](future_roadmap.md).

## Tài liệu và demo đã hoàn thành

- [x] Viết lại [README](../README.md): bài toán, tính năng, điểm kỹ thuật, 3 cấu hình chạy và giới hạn.
- [x] Thêm [mục lục](README.md), [kiến trúc](architecture.md), cập nhật [PRD](prd.md).
- [x] Chạy development, production startup smoke, TypeScript, 29 tests và build.
- [x] Tạo [file mẫu](examples/react-study-note.txt), [script chụp](capture-demo.mjs), 7 ảnh thật và [hướng dẫn](user_guide.md).
- [x] Ghi [bằng chứng và vấn đề còn lại](verification.md), phân biệt pass luồng với chất lượng AI.

## Tiếp theo — trước khi gửi hồ sơ

- [x] P0-01: thống nhất pnpm 9.15.9/lockfile; clean install và CI được kiểm chứng theo [giai đoạn 6](phase6_ci.md).
- [x] P0-02: tách unit/integration AI, thêm FE tests, build/smoke và quality gate GitHub.
- [ ] P0-03: trạng thái AI kiểm tra endpoint thật; chuẩn hóa placeholder `.env.example`.
- [ ] P0-04: E2E Library → hỏi đáp → quiz, có reload và tình huống lỗi.
- [ ] P0-05: đánh giá câu trả lời/nguồn, không coi mindmap “Ý chính/Ý phụ” là đạt.
- [ ] P0-06: thống nhất tên sản phẩm, package metadata và thông tin tác giả/liên hệ.

Trước demo public: auth/ownership, storage, contract upload/URL, quota và kiểm chứng deployment theo P1.

---

# Nhật ký checklist refactor trước đây

> Checkbox và số test dưới đây là ghi nhận lịch sử; không thay thế [kiểm chứng ngày 03/10/2026](verification.md).

# Task List — WorkNote Refactor

## Server Side
- [x] `server/config.ts` — constants tập trung
- [x] `server/middleware/rateLimiter.ts`
- [x] `server/services/geminiService.ts`
- [x] `server/services/fileService.ts`
- [x] `server/routes/processFile.ts`
- [x] `server/routes/processLink.ts`
- [x] `server/routes/chat.ts`
- [x] `server/routes/tts.ts`
- [x] `server/routes/translate.ts`
- [x] `server/routes/translateAudio.ts`
- [x] Refactor `server.ts` → entry point tối giản (900→67 dòng)

## Frontend
- [x] `src/types.ts` — thêm API response types
- [x] `src/constants/index.ts` — TABS, LANGUAGES, ACCENTS
- [x] `src/services/api.ts` — API client layer
- [x] `src/hooks/useApiStatus.ts`
- [x] `src/hooks/useTranslation.ts`
- [x] `src/hooks/useFileManager.ts`
- [x] `src/components/ErrorBoundary.tsx`
- [x] Refactor `src/App.tsx` (434→270 dòng)

## Verification
- [x] `npm run lint` — TypeScript pass, zero errors ✅
- [x] `npm run dev` — Server khởi động thành công ✅
- [x] Manual test: tất cả 7 tabs hoạt động bình thường ✅

## AI Multi-Model & Privacy Engine (Hugging Face + Local AI)
- [x] `project_docs/huggingface_integration_architecture_plan.md` — Kế hoạch kiến trúc toàn diện
- [x] Đội 2 (The Librarian): `server/python/librarian_embed.py` — Python embedding worker (Hugging Face `paraphrase-multilingual-MiniLM-L12-v2`)
- [x] Đội 2 (The Librarian): `server/services/embedService.ts` — Tích hợp `searchSourcesSemantic` với fallback an toàn
- [x] Đội 2 (The Librarian): `server/routes/notebook.ts` — Nâng cấp retrieval ngữ nghĩa trong NotebookLM chat
- [x] Đội 2 (The Librarian): `server/tests/embedServiceSemantic.test.ts` — Unit test ngữ nghĩa
- [x] Đội 1 (The Sentry): `server/services/piiGuardService.ts` — Bóc tách & ẩn danh thông tin cá nhân (CCCD, SĐT, Email, STK, Tên)
- [x] Đội 1 (The Sentry): `server/routes/privacy.ts` — API endpoints `/api/privacy/anonymize` & `/api/privacy/restore`
- [x] Đội 1 (The Sentry): `server/tests/piiGuard.test.ts` — Unit test bảo mật dữ liệu cá nhân
- [x] `server.ts` — Mount route `/api/privacy`
- [x] Đội 3 (The Tutor): Nạp model `Qwen/Qwen2.5-1.5B-Instruct-GGUF` (4-bit `q4_k_m`) chạy 100% offline
- [x] Đội 3 (The Tutor): `server/python/tutor_llm.py` — Python worker hỗ trợ Chat, Tóm tắt, Sinh đề thi RPG Quiz JSON
- [x] Đội 3 (The Tutor): `server/services/tutorService.ts` — Node.js service kết nối worker
- [x] Đội 3 (The Tutor): `server/routes/tutor.ts` — API endpoints `/api/tutor/chat`, `/api/tutor/summarize`, `/api/tutor/quiz-rpg`
- [x] Đội 3 (The Tutor): `server/tests/tutor.test.ts` — Unit test cho cả 3 tính năng của The Tutor
- [x] Chạy kiểm thử toàn diện: 18/18 tests pass ✅

## Giai đoạn 6 — CI

Chi tiết và kết quả live: [phase6_ci.md](phase6_ci.md). CD để sau theo yêu cầu; không có workflow deploy/release.
