import { WebSocketServer } from "ws";
import type { Server } from "http";
import { setupLiveAudioTranslateHandler } from "./liveAudioTranslateHandler.js";

export function initializeWebSockets(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/api/ws/translate" });

  wss.on("connection", (ws) => {
    console.log("[WS] Client connected to live translation");
    setupLiveAudioTranslateHandler(ws);
  });

  console.log("🔌 WebSocket server attached on /api/ws/translate");
}
