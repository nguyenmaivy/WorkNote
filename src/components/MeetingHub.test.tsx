import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import MeetingHub from "./MeetingHub";
import { meetingApi } from "../services/meetingApi";
import { TABS } from "../constants";

vi.mock("../services/meetingApi", () => ({ meetingApi: { sessions: vi.fn() } }));
vi.mock("./MeetingWorkspace", () => ({ default: () => <div>Local workspace</div> }));
vi.mock("./AudioSpeechLab", () => ({ default: ({ mode, audioBlocked, checkAudio, onActiveChange }: any) => <div>{mode}<button disabled={audioBlocked} onClick={async () => { if (await checkAudio()) onActiveChange(true); }}>Online start</button><button onClick={() => onActiveChange(false)}>Online stop</button></div> }));
beforeEach(() => { vi.mocked(meetingApi.sessions).mockReset(); vi.mocked(meetingApi.sessions).mockResolvedValue([]); });
it("has only Meeting navigation and defaults to local without starting audio", async () => {
  expect(TABS.filter(tab => tab.id === "meeting")).toHaveLength(1);
  expect(TABS.some(tab => String(tab.id) === "audiolab")).toBe(false);
  render(<MeetingHub />);
  expect(screen.getByText("Local workspace")).toBeInTheDocument();
  await waitFor(() => expect(meetingApi.sessions).toHaveBeenCalled());
});
it("blocks online audio for any active local session or unknown status", async () => {
  vi.mocked(meetingApi.sessions).mockResolvedValue([{ id: "other", status: "recording", source: "mic" }]);
  render(<MeetingHub />);
  await userEvent.click(screen.getByRole("button", { name: "Hội thoại online" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Online start" })).toBeDisabled());
  expect(screen.getByText(/Có phiên local/)).toBeInTheDocument();
});
it("prevents switching mode while online audio is active", async () => {
  render(<MeetingHub />);
  await userEvent.click(screen.getByRole("button", { name: "Hội thoại online" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Online start" })).toBeEnabled());
  await userEvent.click(screen.getByRole("button", { name: "Online start" }));
  expect(screen.getByRole("button", { name: "Ghi họp local" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Online stop" }));
  expect(screen.getByRole("button", { name: "Ghi họp local" })).toBeEnabled();
});
it("fails closed when session status cannot be read", async () => {
  vi.mocked(meetingApi.sessions).mockRejectedValue(new Error("offline"));
  render(<MeetingHub />);
  await userEvent.click(screen.getByRole("button", { name: "Văn bản & TTS" }));
  await act(async () => {});
  expect(screen.getByRole("button", { name: "Online start" })).toBeDisabled();
});
