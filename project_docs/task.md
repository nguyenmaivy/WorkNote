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
