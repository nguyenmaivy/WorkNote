"""Run with python -I scripts/test_meeting_m0.py; no hardware/models needed."""
import argparse
import importlib.util
import json
from pathlib import Path
import queue
import tempfile
import threading
import time
import unittest
from unittest.mock import MagicMock, patch
import wave

spec = importlib.util.spec_from_file_location("meeting_m0", Path(__file__).with_name("meeting_m0.py"))
m0 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m0)


class M0Tests(unittest.TestCase):
    def test_wav_validation(self):
        with tempfile.TemporaryDirectory() as folder:
            filename = Path(folder) / "sample.wav"
            for channels, rate, frames, valid in ((1, 16000, 160, True), (2, 16000, 160, False),
                                                  (1, 48000, 160, False), (1, 16000, 0, False)):
                with wave.open(str(filename), "wb") as audio:
                    audio.setnchannels(channels)
                    audio.setsampwidth(2)
                    audio.setframerate(rate)
                    audio.writeframes(b"\0\0" * frames * channels)
                if valid:
                    self.assertEqual(len(m0.read_wav(filename)), frames)
                else:
                    with self.assertRaises(ValueError):
                        m0.read_wav(filename)

    def test_quality_preserves_accents_and_negation(self):
        self.assertEqual(m0.quality("  THỨ sáu ", "thứ sáu")["wer"], 0)
        self.assertGreater(m0.quality("không duyệt", "duyệt")["wer"], 0)
        self.assertGreater(m0.quality("sáu", "sau")["cer"], 0)
        with self.assertRaises(ValueError):
            m0.quality(" ", "text")

    def test_metrics_and_short_silent_window(self):
        self.assertEqual(m0.percentile([1, 2, 3], .5), 2)
        self.assertIsNone(m0.percentile([], .95))
        report = m0.benchmark_pass([0] * 160, lambda samples: "", 5)
        self.assertEqual(report["audio_seconds"], .01)
        self.assertEqual(len(report["chunks"]), 1)
        self.assertAlmostEqual(report["rtf"], report["elapsed_seconds"] / .01)
        json.dumps(report, allow_nan=False)

    def test_replay_deadlines_short_final_and_compute_rtf(self):
        report = m0.replay_pass([0] * 400, lambda samples: str(len(samples)), .01)
        self.assertEqual([c["text"] for c in report["chunks"]], ["160", "160", "80"])
        self.assertEqual([c["scheduled_ready_seconds"] for c in report["chunks"]], [.01, .02, .025])
        for chunk in report["chunks"]:
            self.assertGreaterEqual(chunk["enqueued_seconds"], chunk["scheduled_ready_seconds"])
            self.assertGreaterEqual(chunk["queue_wait_seconds"], 0)
            self.assertGreaterEqual(chunk["window_start_latency_seconds"], chunk["window_end_latency_seconds"])
        self.assertGreaterEqual(report["wall_rtf"], 1)
        self.assertAlmostEqual(report["rtf"], sum(c["processing_seconds"] for c in report["chunks"]) / .025)
        self.assertEqual(report["assessment"], "smoke_only")
        json.dumps(report, allow_nan=False)

    def test_replay_rechecks_deadline_after_early_wakeup(self):
        now = [0.0]

        class EarlyEvent:
            def __init__(self):
                self.flag = False

            def is_set(self):
                return self.flag

            def set(self):
                self.flag = True

            def wait(self, seconds):
                now[0] += max(seconds / 2, .001)
                return self.flag

        with patch.object(m0.threading, "Event", EarlyEvent), \
                patch.object(m0.threading, "Thread") as thread, \
                patch.object(m0.time, "monotonic", side_effect=lambda: now[0]):
            thread.side_effect = lambda **kwargs: MagicMock(start=kwargs["target"])
            report = m0.replay_pass([0] * 240, lambda samples: "ok", .01)
        self.assertEqual([c["scheduled_ready_seconds"] for c in report["chunks"]], [.01, .015])
        self.assertTrue(all(c["enqueued_seconds"] >= c["scheduled_ready_seconds"] for c in report["chunks"]))

    def test_replay_slow_consumer_has_backlog(self):
        def slow(samples):
            time.sleep(.02)
            return "text"
        report = m0.replay_pass([0] * 1600, slow, .005)
        self.assertGreater(report["queue_depth_peak"], 1)
        self.assertGreater(report["queue_wait_seconds_max"], .01)
        self.assertGreater(report["rtf"], 1)

    def test_replay_overload_and_inference_failure_cleanup(self):
        def slow(samples):
            time.sleep(.08)
            return "text"
        with self.assertRaisesRegex(RuntimeError, "queue full"):
            m0.replay_pass([0] * 1600, slow, .0005)
        with self.assertRaisesRegex(ValueError, "decode failed"):
            m0.replay_pass([0] * 160, MagicMock(side_effect=ValueError("decode failed")), .005)
        self.assertFalse(any(t.name == "m0-replay-producer" for t in threading.enumerate()))

    def test_memory_sampling_and_cleanup(self):
        reading = {"status": "ok", "total_physical_bytes": 10000, "available_physical_bytes": 5000,
                   "process": {"status": "ok", "working_set_bytes": 100, "lifetime_peak_working_set_bytes": 900}}
        with patch.object(m0, "memory_snapshot", return_value=reading):
            self.assertEqual(m0.hardware()["ram_bytes"], 10000)
            with m0.measure_memory(123) as report:
                pass
            self.assertEqual(report["stt_sampled_max_working_set_bytes"], 100)
            self.assertEqual(report["llm_sampled_max_working_set_bytes"], 100)
            self.assertEqual(report["samples"][0]["stt"]["process"]["lifetime_peak_working_set_bytes"], 900)
            self.assertEqual(report["minimum_sampled_available_physical_bytes"], 5000)
            self.assertGreaterEqual(report["sample_count"], 2)
        unavailable = {"status": "unavailable", "reason": "unsupported"}
        with patch.object(m0, "memory_snapshot", return_value=unavailable):
            with self.assertRaisesRegex(ValueError, "test"):
                with m0.measure_memory() as report:
                    raise ValueError("test")
            self.assertIsNone(report["stt_sampled_max_working_set_bytes"])
            self.assertIn("llm_memory_note", report)
        self.assertFalse(any(t.name == "m0-memory" for t in threading.enumerate()))
        with patch.object(m0.sys, "platform", "linux"):
            self.assertEqual(m0.memory_snapshot()["status"], "unavailable")

    def test_invalid_llm_pid(self):
        for pid, enabled in ((0, True), (-1, True), (m0.os.getpid(), True), (123, False)):
            args = argparse.Namespace(report="unused-report.json", wav="unused.wav", reference=None,
                                      llm_pid=pid, with_llm=enabled)
            with patch.object(m0, "read_wav", return_value=[0] * 160):
                with self.assertRaisesRegex(ValueError, "--llm-pid"):
                    m0.benchmark(args)

    def test_overflow_is_reported(self):
        buffer = queue.Queue(maxsize=1)
        stats = {"queue_overflows": 0, "dropped_bytes": 0}
        m0.enqueue_frame(buffer, b"12", stats)
        m0.enqueue_frame(buffer, b"3456", stats)
        self.assertEqual(stats, {"queue_overflows": 1, "dropped_bytes": 4})
        self.assertEqual(buffer.get_nowait(), b"12")

    def test_capture_loopback_routing_and_frames(self):
        loopback = {"index": 10, "name": "Speakers [Loopback]", "hostApi": 2,
                    "isLoopbackDevice": True, "maxInputChannels": 2, "defaultSampleRate": 48000}
        speaker = {**loopback, "index": 8, "name": "Speakers", "isLoopbackDevice": False,
                   "maxInputChannels": 0, "maxOutputChannels": 2}
        for selected in (speaker, loopback):
            for has_frames in (False, True):
                with self.subTest(selected=selected["index"], has_frames=has_frames):
                    backend = MagicMock()
                    audio = backend.PyAudio.return_value.__enter__.return_value
                    audio.get_device_info_by_index.return_value = selected
                    audio.get_host_api_info_by_type.return_value = {"index": 2}
                    audio.get_wasapi_loopback_analogue_by_dict.return_value = loopback
                    stream = audio.open.return_value
                    stream.is_active.return_value = False
                    if has_frames:
                        def open_stream(**kwargs):
                            kwargs["stream_callback"](b"\0" * 1920, 480, None, 0)
                            return stream
                        audio.open.side_effect = open_stream
                    with tempfile.TemporaryDirectory() as folder:
                        destination = Path(folder) / "capture.wav"
                        args = argparse.Namespace(output=str(destination), source="loopback",
                                                  device=selected["index"], seconds=10)
                        with patch.object(m0, "audio_backend", return_value=backend), \
                                patch.object(m0.time, "monotonic", side_effect=[0, 0, 11, 11]):
                            if has_frames:
                                m0.capture(args)
                            else:
                                with self.assertRaisesRegex(RuntimeError, "no audio frames"):
                                    m0.capture(args)
                        report = json.loads(Path(str(destination) + ".json").read_text(encoding="utf-8"))
                        self.assertEqual(report["frames"], 480 if has_frames else 0)
                        self.assertEqual(report["audio_seconds"], .01 if has_frames else 0)
                        self.assertEqual("error" in report, not has_frames)
                        self.assertEqual(audio.open.call_args.kwargs["input_device_index"], 10)
                        audio.get_wasapi_loopback_analogue_by_dict.assert_called_once_with(selected)
                        stream.close.assert_called_once()

    def test_capture_rejects_invalid_loopback_devices(self):
        for host_api, mapping_error in ((0, None), (2, ValueError("not output")),
                                        (2, LookupError("no analogue"))):
            with self.subTest(host_api=host_api, mapping_error=mapping_error):
                backend = MagicMock()
                audio = backend.PyAudio.return_value.__enter__.return_value
                audio.get_device_info_by_index.return_value = {"hostApi": host_api}
                audio.get_host_api_info_by_type.return_value = {"index": 2}
                audio.get_wasapi_loopback_analogue_by_dict.side_effect = mapping_error
                with tempfile.TemporaryDirectory() as folder:
                    args = argparse.Namespace(output=str(Path(folder) / "invalid.wav"),
                                              source="loopback", device=9, seconds=10)
                    with patch.object(m0, "audio_backend", return_value=backend):
                        with self.assertRaises((ValueError, LookupError)):
                            m0.capture(args)
                    audio.open.assert_not_called()

    def test_report_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "report.json"
            m0.write_report(path, {"text": "Tiếng Việt"})
            with self.assertRaises(FileExistsError):
                m0.write_report(path, {})
            self.assertEqual(json.loads(path.read_text(encoding="utf-8"))["text"], "Tiếng Việt")

    def test_llm_boundary(self):
        self.assertEqual(m0.local_url("http://127.0.0.1:11434/v1/"), "http://127.0.0.1:11434/v1")
        for url in ("https://external.example/v1", "http://127.0.0.1.evil/v1", "file:///models",
                    "http://user@localhost/v1", "http://localhost/v1?query=1"):
            with self.assertRaises(ValueError):
                m0.local_url(url)
        with self.assertRaises(ValueError):
            m0.NoRedirect().redirect_request(None, None, None, None, None, None)

    def test_llm_failure_is_not_success(self):
        args = argparse.Namespace(llm_url="http://127.0.0.1:11434/v1", llm_model="test")
        with patch.object(m0, "request_json", side_effect=TimeoutError("timeout")):
            result = m0.llm_load(args)
        self.assertEqual(result["status"], "error")
        self.assertIn("timeout", result["error"])

    def test_positive_rejects_nonfinite(self):
        for value in ("nan", "inf", "0", "-1", "3601"):
            with self.assertRaises(argparse.ArgumentTypeError):
                m0.positive(value)


if __name__ == "__main__":
    unittest.main()
