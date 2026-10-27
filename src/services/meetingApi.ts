import type { MeetingNoteState } from "../../shared/meeting";
export type MeetingSource = "mic" | "system";
export interface MeetingDevice { id: string; label: string }
export interface MeetingSession { id: string; source: MeetingSource; title?: string; status: string; created_at?: string; createdAt?: string }
export interface MeetingEvent { seq: number; type: string; [key: string]: any }

let tokenPromise: Promise<string> | undefined;
async function token() {
  tokenPromise ??= fetch("/api/meeting/token").then(async (r) => {
    if (!r.ok) throw new Error(`Meeting service returned ${r.status}`);
    const body = await r.json();
    if (!body.token) throw new Error("Meeting service did not provide a token");
    return body.token as string;
  }).catch((e) => { tokenPromise = undefined; throw e; });
  return tokenPromise;
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response = await fetch(`/api/meeting${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}), "X-Meeting-Token": await token() } });
  if (response.status === 401) { tokenPromise = undefined; response = await fetch(`/api/meeting${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}), "X-Meeting-Token": await token() } }); }
  if (!response.ok) throw new Error(`Meeting request failed (${response.status})`);
  return response.json() as Promise<T>;
}
export const meetingApi = {
  note: (id: string) => request<MeetingNoteState>(`/sessions/${encodeURIComponent(id)}/note`),
  generateNote: (id: string) => request<MeetingNoteState>(`/sessions/${encodeURIComponent(id)}/note`, { method: "POST" }),
  sessions: async () => (await request<{ sessions: MeetingSession[] }>("/sessions")).sessions,
  devices: async (source: MeetingSource) => (await request<{ devices: MeetingDevice[] }>(`/devices?source=${source}`)).devices,
  start: async (body: { source: MeetingSource; device?: string; title?: string; final_engine?: "sherpa" | "whisper"; vocabulary?: string; consent: true }) => (await request<{ session: MeetingSession }>("/sessions", { method: "POST", body: JSON.stringify(body) })).session,
  session: async (id: string) => (await request<{ session: MeetingSession }>(`/sessions/${encodeURIComponent(id)}`)).session,
  events: async (id: string, after: number) => request<{ events: MeetingEvent[]; next_seq: number }>(`/sessions/${encodeURIComponent(id)}/events?after=${after}`),
  stop: async (id: string) => (await request<{ session: MeetingSession }>(`/sessions/${encodeURIComponent(id)}/stop`, { method: "POST" })).session,
  remove: (id: string) => request<{ deleted: true }>(`/sessions/${encodeURIComponent(id)}`, { method: "DELETE" }),
  exportUrl: async (id: string) => {
    const response = await fetch(`/api/meeting/sessions/${encodeURIComponent(id)}/export`, { headers: { "X-Meeting-Token": await token() } });
    if (!response.ok) throw new Error(`Export failed (${response.status})`);
    return response.blob();
  },
  socket: async () => {
    const key = await token();
    const scheme = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${scheme}//${location.host}/api/ws/meeting`);
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => ws.send(JSON.stringify({ type: "auth", token: key }));
      ws.onmessage = (message) => {
        try {
          if (JSON.parse(message.data).type === "authenticated") {
            ws.onmessage = null;
            resolve();
          }
        } catch { reject(new Error("Invalid meeting authentication")); }
      };
      ws.onerror = () => reject(new Error("Unable to connect to meeting stream"));
    });
    return ws;
  },
};