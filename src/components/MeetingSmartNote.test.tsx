import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, expect, it, vi } from "vitest";
import MeetingSmartNote from "./MeetingSmartNote";
import { meetingApi } from "../services/meetingApi";
import type { MeetingNoteState } from "../../shared/meeting";
vi.mock("../services/meetingApi", () => ({ meetingApi: { note: vi.fn(), generateNote: vi.fn() } }));
const state: MeetingNoteState = { status: "error", error: "Invalid JSON", note: { session_id: "one", revision: 2, watermark_seq: 4, created_at: "now", content: { summary: "Ghi chú tốt gần nhất", key_points: [{ text: "Cần xác nhận", source_segment_ids: ["s1"] }], decisions: [], action_items: [], open_questions: [] } } };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(meetingApi.note).mockResolvedValue({ status: "idle", error: null, note: null }); });
it("retains last good note, displays watermark/error and exposes transcript sources", async () => {
  vi.mocked(meetingApi.note).mockResolvedValue(state);
  render(<MeetingSmartNote sessionId="one" events={[{ seq: 4, type: "transcript.final", segment: { id: "s1", start_ms: 0, end_ms: 5000, text_raw: "Chưa xác nhận yêu cầu" } }]} />);
  expect(await screen.findByText("Ghi chú tốt gần nhất")).toBeInTheDocument();
  expect(screen.getByText(/Watermark seq 4/)).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("Invalid JSON");
  await userEvent.click(screen.getByText("Nguồn (1)"));
  expect(screen.getByText(/Chưa xác nhận yêu cầu/)).toBeVisible();
  expect(meetingApi.generateNote).not.toHaveBeenCalled();
});
it("requests generation explicitly and disables repeated requests while pending", async () => {
  vi.mocked(meetingApi.generateNote).mockResolvedValue({ note: null, status: "pending", error: null });
  render(<MeetingSmartNote sessionId="one" events={[]} />);
  await screen.findByText("Trạng thái: idle");
  await userEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(meetingApi.generateNote).toHaveBeenCalledWith("one"));
  expect(screen.getByRole("button")).toBeDisabled();
});
it("ignores late responses from a previous session", async () => {
  let resolve!: (value: MeetingNoteState) => void;
  vi.mocked(meetingApi.note).mockReturnValueOnce(new Promise(r => { resolve = r; }));
  const view = render(<MeetingSmartNote sessionId="one" events={[]} />);
  view.rerender(<MeetingSmartNote sessionId="two" events={[]} />);
  await screen.findByText("Trạng thái: idle");
  resolve(state);
  await waitFor(() => expect(screen.queryByText("Ghi chú tốt gần nhất")).not.toBeInTheDocument());
});
