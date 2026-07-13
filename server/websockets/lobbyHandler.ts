import type { WebSocket } from "ws";

// Real-time multiplayer lobby: players join a room by id and we relay their
// position + chat to everyone else in that room. No Gemini, no DB — pure relay.

interface Player {
  id: string;
  name: string;
  cls: string;
  x: number;
  y: number;
  dir: string;
  moving: boolean;
}

const rooms = new Map<string, Map<string, { ws: WebSocket; p: Player }>>();
let counter = 1;

export function setupLobbyHandler(ws: WebSocket) {
  const id = `u${counter++}_${Math.random().toString(36).slice(2, 7)}`;
  let roomId: string | null = null;

  const send = (obj: unknown) => {
    try {
      ws.send(JSON.stringify(obj));
    } catch {
      /* ignore */
    }
  };

  const roster = () => {
    const room = roomId ? rooms.get(roomId) : null;
    return room ? [...room.values()].map((e) => e.p) : [];
  };

  const broadcast = (obj: unknown, includeSelf = false) => {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const data = JSON.stringify(obj);
    for (const [pid, entry] of room) {
      if (!includeSelf && pid === id) continue;
      try {
        entry.ws.send(data);
      } catch {
        /* ignore */
      }
    }
  };

  send({ type: "welcome", id });

  ws.on("message", (raw: Buffer) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "join") {
      roomId = String(msg.room || "lobby").slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, "") || "lobby";
      if (!rooms.has(roomId)) rooms.set(roomId, new Map());
      const room = rooms.get(roomId)!;
      const p: Player = {
        id,
        name: String(msg.name || "Player").slice(0, 24),
        cls: String(msg.cls || "mage"),
        x: Number(msg.x) || 380,
        y: Number(msg.y) || 300,
        dir: "down",
        moving: false,
      };
      room.set(id, { ws, p });
      // Everyone (including the new joiner) gets the fresh roster.
      broadcast({ type: "players", players: roster() }, true);
      return;
    }

    if (!roomId) return;
    const room = rooms.get(roomId);
    const entry = room?.get(id);
    if (!entry) return;

    if (msg.type === "move") {
      entry.p.x = Number(msg.x) || entry.p.x;
      entry.p.y = Number(msg.y) || entry.p.y;
      entry.p.dir = String(msg.dir || entry.p.dir);
      entry.p.moving = !!msg.moving;
      broadcast({ type: "move", id, x: entry.p.x, y: entry.p.y, dir: entry.p.dir, moving: entry.p.moving });
    } else if (msg.type === "chat") {
      const text = String(msg.text || "").slice(0, 400).trim();
      if (text) broadcast({ type: "chat", id, name: entry.p.name, text });
    } else if (msg.type === "rename") {
      entry.p.name = String(msg.name || entry.p.name).slice(0, 24);
      entry.p.cls = String(msg.cls || entry.p.cls);
      broadcast({ type: "players", players: roster() }, true);
    }
  });

  const cleanup = () => {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    room.delete(id);
    if (room.size === 0) rooms.delete(roomId);
    else broadcast({ type: "leave", id });
    roomId = null;
  };

  ws.on("close", cleanup);
  ws.on("error", cleanup);
}
