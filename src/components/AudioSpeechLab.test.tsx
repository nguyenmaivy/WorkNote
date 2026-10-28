import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AudioSpeechLab from "./AudioSpeechLab";

let instance: any;
class Recognition {
  onstart: any; onresult: any; onend: any; onerror: any;
  start = vi.fn(() => this.onstart?.());
  abort = vi.fn();
}
const checkAudio = vi.fn();
const activeChange = vi.fn();
beforeEach(() => { checkAudio.mockReset().mockResolvedValue(true); activeChange.mockReset(); vi.stubGlobal("SpeechRecognition", vi.fn(function () { instance = new Recognition(); return instance; })); vi.stubGlobal("fetch", vi.fn()); });
afterEach(() => vi.unstubAllGlobals());
function show(mode: "live" | "text" = "live", blocked = false) { return render(<AudioSpeechLab mode={mode} audioBlocked={blocked} checkAudio={checkAudio} onActiveChange={activeChange} />); }
async function start() { await userEvent.click(screen.getByRole("checkbox")); await userEvent.click(screen.getByRole("button", { name: "Bắt đầu dịch live" })); }
it("requires consent and checks local status before starting mic", async () => {
  show(); expect(screen.getByRole("button", { name: "Bắt đầu dịch live" })).toBeDisabled();
  await start(); expect(checkAudio).toHaveBeenCalled(); expect(instance.start).toHaveBeenCalledOnce();
  await userEvent.click(screen.getByRole("button", { name: "Dừng mic online" }));
  expect(instance.abort).toHaveBeenCalledOnce(); expect(instance.onend).toBeNull();
  expect(activeChange).toHaveBeenLastCalledWith(false);
});
it("aborts recognition on unmount and ignores a translation resolving after stop", async () => {
  let resolve: (value: any) => void = () => {};
  vi.mocked(fetch).mockReturnValue(new Promise(done => { resolve = done; }));
  const view = show(); await start();
  const result: any = [{ transcript: "Hello" }]; result.isFinal = true;
  act(() => { void instance.onresult({ resultIndex: 0, results: [result], timeStamp: 1 }); });
  await userEvent.click(screen.getByRole("button", { name: "Dừng mic online" }));
  await act(async () => { resolve({ ok: true, json: async () => [[["Xin chào"]]] }); });
  expect(screen.queryByText("Xin chào")).not.toBeInTheDocument();
  view.unmount(); expect(instance.onend).toBeNull();
});
it("shows actual translation failures, not demo content", async () => {
  vi.mocked(fetch).mockResolvedValue({ ok: false, status: 503 } as Response);
  show("text"); await userEvent.type(screen.getByRole("textbox", { name: "Văn bản" }), "Hello");
  await userEvent.click(screen.getByRole("button", { name: "Dịch văn bản online" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("503"); expect(screen.queryByText(/\[Demo\]/)).not.toBeInTheDocument();
});
it("does not start microphone or playback while local status is blocked", async () => {
  show("live", true); await userEvent.click(screen.getByRole("checkbox"));
  expect(screen.getByRole("button", { name: "Bắt đầu dịch live" })).toBeDisabled();
  expect(fetch).not.toHaveBeenCalled();
});
it("rechecks local status even when initial UI allowed audio", async () => {
  checkAudio.mockResolvedValue(false); show(); await start();
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Không thể bật mic"));
  expect(activeChange).not.toHaveBeenCalledWith(true);
});
