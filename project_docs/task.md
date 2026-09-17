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
- [x] Chạy kiểm thử toàn diện: 15/15 tests pass ✅
