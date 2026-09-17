import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";

import { PORT, UPLOAD_DIR, MAX_FILE_SIZE_LABEL } from "./server/config.js";
import { apiLimiter, heavyAiLimiter } from "./server/middleware/rateLimiter.js";

// Routes
import processFileRouter from "./server/routes/processFile.js";
import processLinkRouter from "./server/routes/processLink.js";
import chatRouter from "./server/routes/chat.js";
import ttsRouter from "./server/routes/tts.js";
import ttsReadRouter from "./server/routes/ttsRead.js";
import translateRouter from "./server/routes/translate.js";
import translateAudioRouter from "./server/routes/translateAudio.js";
import subtitleTranslateRouter from "./server/routes/subtitleTranslate.js";
import youtubeTranscriptRouter from "./server/routes/youtubeTranscript.js";
import transcribeRouter from "./server/routes/transcribe.js";
import notebookRouter from "./server/routes/notebook.js";
import privacyRouter from "./server/routes/privacy.js";

const app = express();

// ─── Ensure upload directory exists ──────────────────────────────────────────
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ─── Body Parser ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ─── Rate Limiters ────────────────────────────────────────────────────────────
app.use("/api/", apiLimiter);
app.use("/api/process-file", heavyAiLimiter);
app.use("/api/process-link", heavyAiLimiter);
app.use("/api/translate-live-audio", heavyAiLimiter);
app.use("/api/transcribe", heavyAiLimiter);
app.use("/api/notebook/chat", heavyAiLimiter);
app.use("/api/notebook/summary", heavyAiLimiter);
app.use("/api/notebook/quiz", heavyAiLimiter);
app.use("/api/notebook/sources/upload", heavyAiLimiter);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/process-file", processFileRouter);
app.use("/api/process-link", processLinkRouter);
app.use("/api/chat", chatRouter);
app.use("/api/tts", ttsRouter);
app.use("/api/tts-read", ttsReadRouter);
app.use("/api/translate", translateRouter);
app.use("/api/translate-live-audio", translateAudioRouter);
app.use("/api/subtitle-translate", subtitleTranslateRouter); // free, no-Gemini subtitle MT
app.use("/api/youtube-transcript", youtubeTranscriptRouter); // real timed captions (no Gemini)
app.use("/api/transcribe", transcribeRouter); // Gemini timestamped transcription (uploaded media)
app.use("/api/notebook", notebookRouter);
app.use("/api/privacy", privacyRouter);

// Multer error handler: return clear JSON for file size or other upload errors
app.use((err: any, _req: any, res: any, next: any) => {
  if (err && err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: `File too large. Max size is ${MAX_FILE_SIZE_LABEL}.` });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

import http from "http";
import { initializeWebSockets } from "./server/websockets/index.js";

// ─── Vite / Static Middleware ─────────────────────────────────────────────────
async function initMiddlewaresAndStart() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const httpServer = http.createServer(app);

  // Attach WebSocket Server
  initializeWebSockets(httpServer);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

initMiddlewaresAndStart();
