import { WebSocketServer } from "ws";
import type { Server } from "http";
import { setupLiveAudioTranslateHandler } from "./liveAudioTranslateHandler.js";
import { setupLobbyHandler } from "./lobbyHandler.js";

export function initializeWebSockets(httpServer: Server) {
  // Multiple WS endpoints on one HTTP server → use noServer + route the upgrade
  // ourselves (two `{ server, path }` servers would 400 each other's paths).
  const translateWss = new WebSocketServer({ noServer: true });
  translateWss.on("connection", (ws) => {
    console.log("[WS] Client connected to live translation");
    setupLiveAudioTranslateHandler(ws);
  });

  const lobbyWss = new WebSocketServer({ noServer: true });
  lobbyWss.on("connection", (ws) => setupLobbyHandler(ws));

  httpServer.on("upgrade", (req, socket, head) => {
    let pathname = "";
    try {
      pathname = new URL(req.url || "", "http://localhost").pathname;
    } catch {
      pathname = req.url || "";
    }
    if (pathname === "/api/ws/translate") {
      translateWss.handleUpgrade(req, socket, head, (ws) => translateWss.emit("connection", ws, req));
    } else if (pathname === "/api/ws/lobby") {
      lobbyWss.handleUpgrade(req, socket, head, (ws) => lobbyWss.emit("connection", ws, req));
    } else {
      // Not ours (e.g. Vite HMR runs on its own port) — leave it alone.
    }
  });

  console.log("🔌 WebSocket servers attached on /api/ws/translate and /api/ws/lobby");
}
