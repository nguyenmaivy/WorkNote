import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

import { PORT, UPLOAD_DIR } from "./server/config.js";
import { apiLimiter, heavyAiLimiter } from "./server/middleware/rateLimiter.js";

// Routes
import processFileRouter from "./server/routes/processFile.js";
import processLinkRouter from "./server/routes/processLink.js";
import chatRouter from "./server/routes/chat.js";
import ttsRouter from "./server/routes/tts.js";
import translateRouter from "./server/routes/translate.js";
import translateAudioRouter from "./server/routes/translateAudio.js";

dotenv.config();

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

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/process-file", processFileRouter);
app.use("/api/process-link", processLinkRouter);
app.use("/api/chat", chatRouter);
app.use("/api/tts", ttsRouter);
app.use("/api/translate", translateRouter);
app.use("/api/translate-live-audio", translateAudioRouter);

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
