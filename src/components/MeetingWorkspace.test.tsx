import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MeetingWorkspace from "./MeetingWorkspace";
import { meetingApi } from "../services/meetingApi";

vi.mock("../services/meetingApi", () => ({ meetingApi: {
  note: vi.fn(), generateNote: vi.fn(), sessions: vi.fn(), devices: vi.fn(), start: vi.fn(), session: vi.fn(), events: vi.fn(), socket: vi.fn(), stop: vi.fn(), remove: vi.fn(), exportUrl: vi.fn(),
} }));

const session = { id: "m-1", source: "mic" as const, status: "running", title: "Team sync" };
function socketMock() {
  const handlers: Record<string, (event: any) => void> = {};
  return { send: vi.fn(), close: vi.fn(), set onmessage(fn: (event: any) => void) { handlers.message = fn; }, get onmessage() { return handlers.message; }, emit(value: unknown) { handlers.message?.({ data: JSON.stringify(value) }); } };
}

describe("MeetingWorkspace", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(meetingApi.note).mockResolvedValue({ note: null, status: "idle", error: null });
    vi.mocked(meetingApi.sessions).mockResolvedValue([]);
    vi.mocked(meetingApi.devices).mockResolvedValue([{ id: "mic-1", label: "Desk mic" }]);
    vi.mocked(meetingApi.session).mockResolvedValue(session);
    vi.mocked(meetingApi.events).mockResolvedValue({ events: [], next_seq: 0 });
    vi.mocked(meetingApi.socket).mockResolvedValue(socketMock() as any);
  });

  it("requires consent, starts only through the API, then renders final transcript events", async () => {
    vi.mocked(meetingApi.start).mockResolvedValue(session);
    const user = userEvent.setup();
    render(<MeetingWorkspace />);
    const start = screen.getByRole("button", { name: /start transcription/i });
    expect(start).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(start);
    await waitFor(() => expect(meetingApi.start).toHaveBeenCalledWith({ source: "mic", consent: true }));
    expect(await screen.findByRole("heading", { name: "Team sync" })).toBeInTheDocument();
    const ws = await vi.mocked(meetingApi.socket).mock.results[0].value;
    ws.emit({ type: "event", event: { seq: 1, type: "transcript.final", payload: { segment: { text_raw: "Hello" } } } });
    expect(await screen.findByText("Hello")).toBeInTheDocument();
  });

  it("passes optional multilingual engine and vocabulary to the backend", async () => {
    vi.mocked(meetingApi.start).mockResolvedValue(session);
    render(<MeetingWorkspace />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole("combobox", { name: "Nhận dạng bản chốt" }), "whisper");
    await user.type(screen.getByRole("textbox", { name: /Tên riêng/ }), "Microsoft, OpenAI");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /start transcription/i }));
    await waitFor(() => expect(meetingApi.start).toHaveBeenCalledWith({ source: "mic", consent: true, final_engine: "whisper", vocabulary: "Microsoft, OpenAI" }));
  });

  it("hydrates bounded event pages until all durable events are fetched without duplicate seqs", async () => {
    const first = Array.from({ length: 100 }, (_, i) => ({ seq: i + 1, type: "transcript.final", payload: { segment: { text_raw: `line-${i + 1}` } } }));
    vi.mocked(meetingApi.sessions).mockResolvedValue([session]);
    vi.mocked(meetingApi.events)
      .mockResolvedValueOnce({ events: first, next_seq: 100 })
      .mockResolvedValueOnce({ events: [{ seq: 101, type: "transcript.final", payload: { segment: { text_raw: "last-line" } } }], next_seq: 101 });
    const ws = socketMock(); vi.mocked(meetingApi.socket).mockResolvedValue(ws as any);
    render(<MeetingWorkspace />);
    await userEvent.click(await screen.findByRole("button", { name: /Team sync/ }));
    await waitFor(() => expect(screen.getByText("last-line")).toBeInTheDocument());
    expect(meetingApi.events).toHaveBeenNthCalledWith(1, session.id, 0);
    expect(meetingApi.events).toHaveBeenNthCalledWith(2, session.id, 100);
    ws.emit({ type: "event", event: { seq: 101, type: "transcript.final", payload: { segment: { text_raw: "last-line" } } } });
    expect(screen.getAllByText("last-line")).toHaveLength(1);
  });

  it("replays Vietnamese on reconnect and continues live without stopping or duplicating", async () => {
    vi.mocked(meetingApi.start).mockResolvedValue(session);
    const first = socketMock(), second = socketMock();
    vi.mocked(meetingApi.socket).mockResolvedValueOnce(first as any).mockResolvedValueOnce(second as any);
    const event = { seq: 1, type: "transcript.final", segment: { text_raw: "Cuộc họp tiếng Việt" } };
    render(<MeetingWorkspace />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /start transcription/i }));
    await waitFor(() => expect(first.send).toHaveBeenCalled());
    first.emit({ type: "event", event });
    expect(await screen.findByText("Cuộc họp tiếng Việt")).toBeInTheDocument();
    vi.mocked(meetingApi.events).mockResolvedValue({ events: [event], next_seq: 1 });
    await user.click(screen.getByRole("button", { name: "Reconnect" }));
    await waitFor(() => expect(second.send).toHaveBeenCalled());
    second.emit({ type: "event", event });
    second.emit({ type: "event", event: { seq: 2, type: "transcript.final", segment: { text_raw: "Tiếp tục ghi âm" } } });
    expect(await screen.findByText("Tiếp tục ghi âm")).toBeInTheDocument();
    expect(screen.getAllByText("Cuộc họp tiếng Việt")).toHaveLength(1);
    expect(meetingApi.stop).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Stop" })).toBeEnabled();
  });

  it("replaces provisional captions, clears on final and ignores stale previews", async () => {
    vi.mocked(meetingApi.start).mockResolvedValue(session);
    const ws = socketMock();
    vi.mocked(meetingApi.socket).mockResolvedValue(ws as any);
    render(<MeetingWorkspace />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /start transcription/i }));
    await waitFor(() => expect(ws.send).toHaveBeenCalled());
    ws.emit({ type: "transcript.partial", segment: { start_ms: 0, end_ms: 500, text_raw: "Xin" } });
    expect(await screen.findByText("Xin")).toBeInTheDocument();
    ws.emit({ type: "transcript.partial", segment: { start_ms: 0, end_ms: 1000, text_raw: "Xin chào" } });
    expect(await screen.findByText("Xin chào")).toBeInTheDocument();
    expect(screen.queryByText("Xin")).not.toBeInTheDocument();
    ws.emit({ type: "event", event: { seq: 1, type: "transcript.final", segment: { start_ms: 0, end_ms: 5000, text_raw: "Xin chào cả nhà" } } });
    expect(await screen.findByText("Xin chào cả nhà")).toBeInTheDocument();
    expect(screen.queryByText("Xin chào")).not.toBeInTheDocument();
    ws.emit({ type: "transcript.partial", segment: { start_ms: 0, end_ms: 4000, text_raw: "Bản tạm cũ" } });
    await waitFor(() => expect(screen.queryByText("Bản tạm cũ")).not.toBeInTheDocument());
  });

  it("shows durable gaps and exits recording when the worker fails", async () => {
    vi.mocked(meetingApi.start).mockResolvedValue(session);
    const ws = socketMock();
    vi.mocked(meetingApi.socket).mockResolvedValue(ws as any);
    render(<MeetingWorkspace />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /start transcription/i }));
    await waitFor(() => expect(ws.send).toHaveBeenCalled());
    ws.emit({ type: "transcript.partial", segment: { start_ms: 0, end_ms: 1000, text_raw: "Unfinished preview" } });
    expect(await screen.findByText("Unfinished preview")).toBeInTheDocument();
    ws.emit({ type: "event", event: { seq: 1, type: "gap", start_ms: 0, end_ms: 1000, reason: "capture interrupted" } });
    ws.emit({ type: "event", event: { seq: 2, type: "error", message: "Device disconnected" } });
    expect(await screen.findByText("Transcript gap: capture interrupted")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Device disconnected");
    expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument();
    expect(screen.queryByText("Unfinished preview")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export Markdown" })).toBeEnabled();
  });

  it("surfaces API failures and does not start before consent", async () => {
    vi.mocked(meetingApi.sessions).mockRejectedValue(new Error("Offline"));
    render(<MeetingWorkspace />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
    expect(meetingApi.start).not.toHaveBeenCalled();
  });
});