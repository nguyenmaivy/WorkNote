"""M0 feasibility CLI. No model downloads or recording without an explicit command."""
import argparse
from array import array
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
import ctypes
from ctypes import wintypes
import importlib.metadata
import json
import math
import os
from pathlib import Path
import platform
import queue
import sys
import threading
import time
import unicodedata
import urllib.parse
import urllib.request
import wave


PACKAGES = ("PyAudioWPatch", "faster-whisper", "sherpa-onnx", "numpy")


def local_url(value):
    url = urllib.parse.urlparse(value)
    if (url.scheme != "http" or url.hostname not in ("localhost", "127.0.0.1", "::1")
            or url.username or url.password or url.query or url.fragment):
        raise ValueError("LLM URL must be an HTTP loopback URL without credentials/query")
    return value.rstrip("/")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_args, **_kwargs):
        raise ValueError("LLM redirects are not allowed")


def request_json(url, payload=None, timeout=5):
    local_url(url)
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    with opener.open(request, timeout=timeout) as response:
        raw = response.read(2 * 1024 * 1024 + 1)
        if len(raw) > 2 * 1024 * 1024:
            raise ValueError("LLM response exceeds 2 MiB")
        return json.loads(raw)


def memory_snapshot(pid=None):
    if sys.platform != "win32":
        return {"status": "unavailable", "reason": "Windows memory APIs required"}

    class MemoryStatus(ctypes.Structure):
        _fields_ = [("length", wintypes.DWORD), ("load", wintypes.DWORD)] + [
            (name, ctypes.c_ulonglong) for name in
            ("total", "available", "page_total", "page_available", "virtual_total",
             "virtual_available", "extended_available")]

    class ProcessMemory(ctypes.Structure):
        _fields_ = [("cb", wintypes.DWORD), ("faults", wintypes.DWORD)] + [
            (name, ctypes.c_size_t) for name in
            ("peak_working_set", "working_set", "peak_paged_pool", "paged_pool",
             "peak_nonpaged_pool", "nonpaged_pool", "pagefile", "peak_pagefile")]

    try:
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        psapi = ctypes.WinDLL("psapi", use_last_error=True)
        kernel.GlobalMemoryStatusEx.argtypes = [ctypes.POINTER(MemoryStatus)]
        kernel.GlobalMemoryStatusEx.restype = wintypes.BOOL
        kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        kernel.OpenProcess.restype = wintypes.HANDLE
        kernel.CloseHandle.argtypes = [wintypes.HANDLE]
        kernel.CloseHandle.restype = wintypes.BOOL
        psapi.GetProcessMemoryInfo.argtypes = [wintypes.HANDLE, ctypes.POINTER(ProcessMemory), wintypes.DWORD]
        psapi.GetProcessMemoryInfo.restype = wintypes.BOOL
        system = MemoryStatus()
        system.length = ctypes.sizeof(system)
        if not kernel.GlobalMemoryStatusEx(ctypes.byref(system)):
            raise ctypes.WinError(ctypes.get_last_error())
        result = {"status": "ok", "total_physical_bytes": system.total,
                  "available_physical_bytes": system.available}
        handle = kernel.OpenProcess(0x0400 | 0x0010, False, pid or os.getpid())
        if not handle:
            result["process"] = {"status": "unavailable", "reason": str(ctypes.WinError(ctypes.get_last_error()))}
            return result
        try:
            counters = ProcessMemory()
            counters.cb = ctypes.sizeof(counters)
            if not psapi.GetProcessMemoryInfo(handle, ctypes.byref(counters), counters.cb):
                raise ctypes.WinError(ctypes.get_last_error())
            result["process"] = {"status": "ok", "working_set_bytes": counters.working_set,
                                 "lifetime_peak_working_set_bytes": counters.peak_working_set}
        finally:
            kernel.CloseHandle(handle)
        return result
    except (OSError, AttributeError) as error:
        return {"status": "unavailable", "reason": str(error)}


@contextmanager
def measure_memory(llm_pid=None):
    report = {"sample_interval_seconds": 0.2, "samples": [], "stt_pid": os.getpid(),
              "llm_pid": llm_pid, "llm_pid_verified": False,
              "limitations": "Working set includes Python/WAV/runtime; sampled maxima can miss spikes. "
                              "OS lifetime peaks are not per-pass peaks. External PID is user-supplied."}
    stop = threading.Event()
    lock = threading.Lock()
    started = time.monotonic()

    def sample():
        row = {"seconds": time.monotonic() - started, "stt": memory_snapshot()}
        if llm_pid is not None:
            row["llm"] = memory_snapshot(llm_pid)
        with lock:
            report["samples"].append(row)

    def monitor():
        while not stop.wait(0.2):
            sample()

    sample()
    worker = threading.Thread(target=monitor, name="m0-memory")
    worker.start()
    try:
        yield report
    finally:
        stop.set()
        worker.join()
        sample()
        for target in ("stt", "llm"):
            readings = [r[target]["process"]["working_set_bytes"] for r in report["samples"]
                        if r.get(target, {}).get("process", {}).get("status") == "ok"]
            report[target + "_sampled_max_working_set_bytes"] = max(readings) if readings else None
        available = [r["stt"]["available_physical_bytes"] for r in report["samples"]
                     if r["stt"].get("status") == "ok"]
        report["minimum_sampled_available_physical_bytes"] = min(available) if available else None
        report["sample_count"] = len(report["samples"])
        if llm_pid is None:
            report["llm_memory_note"] = "not measured; supply --llm-pid for the actual LLM worker"


def hardware():
    memory = memory_snapshot()
    return {"os": platform.platform(), "python": platform.python_version(),
            "logical_cores": os.cpu_count(), "ram_bytes": memory.get("total_physical_bytes"),
            "ram_note": "GlobalMemoryStatusEx" if memory["status"] == "ok" else memory["reason"]}


def versions():
    result = {}
    for name in PACKAGES:
        try:
            result[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            result[name] = None
    return result


def write_report(path, report):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as output:
        json.dump(report, output, ensure_ascii=False, indent=2, allow_nan=False)
        output.write("\n")


def read_wav(path):
    with wave.open(str(path), "rb") as audio:
        if (audio.getnchannels(), audio.getsampwidth(), audio.getframerate(), audio.getcomptype()) != (1, 2, 16000, "NONE"):
            raise ValueError("Benchmark needs mono PCM16 WAV at 16000 Hz; convert explicitly first")
        count = audio.getnframes()
        if count == 0 or count > 16000 * 3600:
            raise ValueError("WAV must contain >0 and <=3600 seconds")
        raw = audio.readframes(count)
        if len(raw) != count * 2:
            raise ValueError("Truncated WAV")
    samples = array("h", raw)
    if sys.byteorder != "little":
        samples.byteswap()
    return samples


def percentile(values, fraction):
    ordered = sorted(values)
    if not ordered:
        return None
    index = (len(ordered) - 1) * fraction
    low = math.floor(index)
    high = math.ceil(index)
    return ordered[low] + (ordered[high] - ordered[low]) * (index - low)


def normalized(text):
    return " ".join(unicodedata.normalize("NFC", text).casefold().split())


def edit_distance(left, right):
    row = list(range(len(right) + 1))
    for i, item in enumerate(left, 1):
        following = [i]
        for j, other in enumerate(right, 1):
            following.append(min(following[-1] + 1, row[j] + 1, row[j - 1] + (item != other)))
        row = following
    return row[-1]


def quality(reference, hypothesis):
    reference, hypothesis = normalized(reference), normalized(hypothesis)
    if not reference:
        raise ValueError("Reference must not be empty")
    words = reference.split()
    return {"wer": edit_distance(words, hypothesis.split()) / len(words),
            "cer": edit_distance(reference, hypothesis) / len(reference),
            "normalization": "NFC, casefold, whitespace; accents and punctuation retained"}


def audio_backend():
    if sys.platform != "win32":
        raise RuntimeError("Capture/device enumeration currently supports Windows only")
    import pyaudiowpatch as pa
    return pa


def devices():
    pa = audio_backend()
    with pa.PyAudio() as audio:
        all_devices = [audio.get_device_info_by_index(i) for i in range(audio.get_device_count())]
        defaults = audio.get_host_api_info_by_type(pa.paWASAPI)
        print(json.dumps({"wasapi": defaults, "devices": all_devices}, ensure_ascii=False, indent=2))


def enqueue_frame(buffer, data, stats):
    try:
        buffer.put_nowait(data)
    except queue.Full:
        stats["dropped_bytes"] += len(data)
        stats["queue_overflows"] += 1


def capture(args):
    pa = audio_backend()
    destination = Path(args.output)
    if destination.exists() or Path(str(destination) + ".json").exists():
        raise ValueError("Capture output/report already exists; choose a new path")
    destination.parent.mkdir(parents=True, exist_ok=True)
    stats = {"dropped_bytes": 0, "queue_overflows": 0, "backend_overflows": 0}
    buffer = queue.Queue(maxsize=100)
    stream = None
    started = time.monotonic()
    with pa.PyAudio() as audio:
        if args.device is None:
            info = (audio.get_default_wasapi_loopback() if args.source == "loopback"
                    else audio.get_default_input_device_info())
        else:
            info = audio.get_device_info_by_index(args.device)
        if args.source == "loopback":
            wasapi = audio.get_host_api_info_by_type(pa.paWASAPI)
            if info["hostApi"] != wasapi["index"]:
                raise ValueError("Loopback requires a Windows WASAPI output or loopback device")
            info = audio.get_wasapi_loopback_analogue_by_dict(info)
        if bool(info.get("isLoopbackDevice", False)) != (args.source == "loopback"):
            raise ValueError("Device does not match requested mic/loopback source")
        channels = int(info["maxInputChannels"])
        rate = int(info["defaultSampleRate"])
        if channels < 1:
            raise ValueError("Selected device has no input channels")

        def callback(data, _count, _timing, status):
            if status & pa.paInputOverflow:
                stats["backend_overflows"] += 1
            enqueue_frame(buffer, data, stats)
            return None, pa.paContinue

        report = {"hardware": hardware(), "device": info, "source": args.source,
                  "sample_rate": rate, "channels": channels, "stats": stats}
        print(f"Capturing {args.source}: [{info['index']}] {info['name']} "
              f"({rate} Hz, {channels} channels) for {args.seconds} seconds", flush=True)
        try:
            frames = 0
            with destination.open("xb") as raw_output, wave.open(raw_output, "wb") as output:
                output.setnchannels(channels)
                output.setsampwidth(2)
                output.setframerate(rate)
                stream = audio.open(format=pa.paInt16, channels=channels, rate=rate,
                                    input=True, input_device_index=int(info["index"]),
                                    frames_per_buffer=max(1, rate // 50), stream_callback=callback,
                                    start=False)
                started = time.monotonic()
                stream.start_stream()
                while time.monotonic() - started < args.seconds:
                    if not stream.is_active():
                        raise RuntimeError("Capture stream stopped unexpectedly")
                    try:
                        data = buffer.get(timeout=0.1)
                        output.writeframesraw(data)
                        frames += len(data) // (channels * 2)
                    except queue.Empty:
                        pass
                stream.stop_stream()
                while not buffer.empty():
                    data = buffer.get_nowait()
                    output.writeframesraw(data)
                    frames += len(data) // (channels * 2)
                if frames == 0:
                    raise RuntimeError("Capture received no audio frames; check device routing and play audio for loopback")
        except BaseException as error:
            report["error"] = str(error) or type(error).__name__
            raise
        finally:
            if stream is not None:
                try:
                    if stream.is_active():
                        stream.stop_stream()
                finally:
                    stream.close()
            report["frames"] = frames
            report["audio_seconds"] = frames / rate
            report["elapsed_seconds"] = time.monotonic() - started
            report["known_dropped_seconds"] = stats["dropped_bytes"] / (rate * channels * 2)
            timeline_gap = max(0.0, report["elapsed_seconds"] - report["audio_seconds"])
            report["timeline_gap_seconds"] = timeline_gap
            report["gap_detected"] = any(stats.values()) or timeline_gap > 0.5
            if timeline_gap > 0.5 and not any(stats.values()):
                report["gap_note"] = "Timeline drift: audio duration is shorter than elapsed time (WASAPI loopback emits no frames during silence when no app renders audio)"
            write_report(str(destination) + ".json", report)
    print(f"Captured {destination}; inspect its JSON report for gaps. Native format is not benchmark-ready by default.")


def load_engine(args):
    import numpy as np
    if args.engine == "whisper":
        if not args.model or not Path(args.model).is_dir():
            raise ValueError("Whisper requires an existing local CTranslate2 model directory")
        from faster_whisper import WhisperModel
        model = WhisperModel(args.model, device="cpu", compute_type="int8", cpu_threads=args.threads,
                             local_files_only=True, num_workers=1)

        def transcribe(samples):
            segments, _ = model.transcribe(np.asarray(samples, dtype=np.float32) / 32768,
                                            language="vi", beam_size=1, vad_filter=False,
                                            condition_on_previous_text=False)
            return " ".join(segment.text.strip() for segment in segments)
    else:
        import sherpa_onnx
        for name in ("encoder", "decoder", "joiner", "tokens"):
            if not getattr(args, name) or not Path(getattr(args, name)).is_file():
                raise ValueError(f"Sherpa requires existing --{name} file")
        model = sherpa_onnx.OfflineRecognizer.from_transducer(
            encoder=args.encoder, decoder=args.decoder, joiner=args.joiner, tokens=args.tokens,
            num_threads=args.threads, sample_rate=16000, feature_dim=80, decoding_method="greedy_search")

        def transcribe(samples):
            if len(samples) == 0:
                return ""
            waveform = np.asarray(samples, dtype=np.float32) / 32768
            if len(waveform) < 1600:
                waveform = np.pad(waveform, (0, 1600 - len(waveform)))
            stream = model.create_stream()
            stream.accept_waveform(16000, waveform)
            model.decode_stream(stream)
            return stream.result.text
    return transcribe


def llm_load(args, stop_event=None):
    started = time.monotonic()
    requests_count = 0
    try:
        while True:
            result = request_json(local_url(args.llm_url) + "/chat/completions", {
                "model": args.llm_model, "messages": [{"role": "user", "content":
                    "Viết một bản ghi chú cuộc họp mẫu bằng tiếng Việt, nêu các quyết định và công việc cần làm."}],
                "max_tokens": 256, "temperature": 0.2, "stream": False}, timeout=120)
            if not result.get("choices"):
                raise ValueError("LLM response has no choices")
            requests_count += 1
            if stop_event is None or stop_event.is_set():
                break
        return {"started": started, "ended": time.monotonic(), "status": "ok", "requests_completed": requests_count}
    except Exception as error:
        return {"started": started, "ended": time.monotonic(), "status": "error", "error": str(error), "requests_completed": requests_count}


def benchmark_pass(samples, transcribe, window_seconds):
    # shortcut: fixed offline windows lose boundary context, replace when testing live segmentation.
    timings, chunks = [], []
    started = time.monotonic()
    size = max(1, int(window_seconds * 16000))
    for offset in range(0, len(samples), size):
        begin = time.monotonic()
        text = transcribe(samples[offset:offset + size])
        timings.append(time.monotonic() - begin)
        chunks.append({"start_seconds": offset / 16000,
                       "end_seconds": min(offset + size, len(samples)) / 16000, "text": text})
    ended = time.monotonic()
    duration = len(samples) / 16000
    return {"started": started, "ended": ended, "elapsed_seconds": ended - started,
            "audio_seconds": duration, "rtf": (ended - started) / duration,
            "window_processing_p50": percentile(timings, 0.5),
            "window_processing_p95": percentile(timings, 0.95), "chunks": chunks}


def replay_pass(samples, transcribe, window_seconds):
    pending = queue.Queue(maxsize=20)
    cancelled, finished = threading.Event(), threading.Event()
    lock = threading.Lock()
    errors, timeline, chunks = [], [], []
    started = time.monotonic()
    size = max(1, int(window_seconds * 16000))

    def produce():
        try:
            for offset in range(0, len(samples), size):
                end = min(offset + size, len(samples))
                ready = end / 16000
                while True:
                    remaining = started + ready - time.monotonic()
                    if remaining <= 0:
                        break
                    if cancelled.wait(remaining):
                        return
                if cancelled.is_set():
                    return
                with lock:
                    enqueued = time.monotonic() - started
                    pending.put_nowait((offset, end, ready, enqueued))
                    timeline.append({"seconds": enqueued, "event": "enqueue", "queued_windows": pending.qsize()})
        except queue.Full:
            errors.append(RuntimeError("Replay queue full (20 windows); overload, no successful report"))
            cancelled.set()
        except BaseException as error:
            errors.append(error)
            cancelled.set()
        finally:
            finished.set()

    producer = threading.Thread(target=produce, name="m0-replay-producer")
    producer.start()
    try:
        while True:
            if errors:
                raise errors[0]
            with lock:
                try:
                    offset, end, ready, enqueued = pending.get_nowait()
                except queue.Empty:
                    item = False
                else:
                    item = True
                    begin = time.monotonic() - started
                    timeline.append({"seconds": begin, "event": "dequeue", "queued_windows": pending.qsize()})
            if not item:
                if finished.is_set() and pending.empty():
                    break
                cancelled.wait(0.01)
                continue
            text = transcribe(samples[offset:end])
            done = time.monotonic() - started
            chunks.append({"start_seconds": offset / 16000, "end_seconds": end / 16000,
                           "text": text, "scheduled_ready_seconds": ready,
                           "enqueued_seconds": enqueued, "processing_start_seconds": begin,
                           "processing_end_seconds": done, "producer_lateness_seconds": max(0, enqueued - ready),
                           "queue_wait_seconds": max(0, begin - enqueued), "processing_seconds": done - begin,
                           "window_end_latency_seconds": done - ready,
                           "window_start_latency_seconds": done - offset / 16000})
        if errors:
            raise errors[0]
    finally:
        cancelled.set()
        producer.join()
    ended = time.monotonic()
    duration = len(samples) / 16000
    timings = [c["processing_seconds"] for c in chunks]
    report = {"started": started, "ended": ended, "elapsed_seconds": ended - started,
              "audio_seconds": duration, "rtf": sum(timings) / duration,
              "rtf_definition": "sum of processing times / audio duration; excludes pacing/queue wait",
              "wall_rtf": (ended - started) / duration,
              "window_processing_p50": percentile(timings, .5),
              "window_processing_p95": percentile(timings, .95), "chunks": chunks,
              "queue_capacity_windows": 20,
              "queue_depth_peak": max((r["queued_windows"] for r in timeline), default=0),
              "backlog_timeline": timeline, "backlog_definition": "queued windows, excludes in-flight window",
              "assessment": "smoke_only" if duration < 180 or len(chunks) < 30 else "finite_replay_only",
              "limitations": "Finite WAV replay, not live capture or partial subtitles; no claim of long-term stability."}
    for metric in ("queue_wait_seconds", "window_end_latency_seconds", "window_start_latency_seconds",
                   "producer_lateness_seconds"):
        values = [c[metric] for c in chunks]
        report[metric + "_p95"] = percentile(values, .95)
        report[metric + "_max"] = max(values) if values else None
    return report


def benchmark(args):
    if Path(args.report).exists():
        raise ValueError("Report already exists; choose a new path")
    samples = read_wav(args.wav)
    reference = Path(args.reference).read_text(encoding="utf-8-sig") if args.reference else None
    if reference is not None and not normalized(reference):
        raise ValueError("Reference must not be empty")
    if args.llm_pid is not None and (not args.with_llm or args.llm_pid <= 0 or args.llm_pid == os.getpid()):
        raise ValueError("--llm-pid must be a positive external worker PID and requires --with-llm")
    if args.with_llm:
        local_url(args.llm_url)
    run_pass = replay_pass if args.replay_paced else benchmark_pass
    report = {"hardware": hardware(), "packages": versions(), "engine": args.engine,
              "model_files": {name: getattr(args, name) for name in ("model", "encoder", "decoder", "joiner", "tokens")},
              "mode": "paced WAV replay" if args.replay_paced else "offline non-overlapping windows, unpaced file benchmark",
              "limitations": "Not live capture or partial subtitle latency; fixed windows lose context. "
                              "RAM is sampled process working set, not model-only allocations.",
              "window_seconds": args.window_seconds, "threads": args.threads}
    with measure_memory(args.llm_pid) as memory:
        begin = time.monotonic()
        transcribe = load_engine(args)
        report["model_load_seconds"] = time.monotonic() - begin
    report["model_load_memory"] = memory
    with measure_memory(args.llm_pid) as memory:
        report["baseline"] = run_pass(samples, transcribe, args.window_seconds)
    report["baseline"]["memory"] = memory
    if args.with_llm:
        stop_llm = threading.Event()
        with ThreadPoolExecutor(max_workers=1) as executor:
            with measure_memory(args.llm_pid) as memory:
                future = executor.submit(llm_load, args, stop_llm)
                loaded = run_pass(samples, transcribe, args.window_seconds)
                stop_llm.set()
            loaded["memory"] = memory
            with measure_memory(args.llm_pid) as remaining_memory:
                load = future.result()
            report["llm_remaining_request_memory"] = remaining_memory
        overlap = max(0, min(loaded["ended"], load["ended"]) - max(loaded["started"], load["started"]))
        load["overlap_seconds"] = overlap
        load["overlap_fraction"] = overlap / loaded["elapsed_seconds"] if loaded["elapsed_seconds"] else 0
        load["assessment"] = ("overlap_measured" if load["status"] == "ok" and load["overlap_fraction"] >= 0.8
                              else "inconclusive")
        report["with_llm"] = loaded
        report["llm_load"] = load
        report["llm_url"] = args.llm_url
        report["llm_model"] = args.llm_model
    for name in ("baseline", "with_llm"):
        if name in report and reference is not None:
            report[name]["quality"] = quality(reference, " ".join(c["text"] for c in report[name]["chunks"]))
    write_report(args.report, report)
    print(f"Report saved: {args.report}; finite WAV timing does not prove live capture feasibility.")


def positive(value):
    number = float(value)
    if not math.isfinite(number) or number <= 0 or number > 3600:
        raise argparse.ArgumentTypeError("Value must be finite, >0 and <=3600")
    return number


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    doctor = commands.add_parser("doctor")
    doctor.add_argument("--llm-url", default="http://127.0.0.1:11434/v1")
    commands.add_parser("devices")
    record = commands.add_parser("capture", help="Explicitly record local audio; obtain consent first")
    record.add_argument("--source", choices=("mic", "loopback"), required=True)
    record.add_argument("--device", type=int)
    record.add_argument("--seconds", type=positive, default=10)
    record.add_argument("--output", required=True)
    bench = commands.add_parser("benchmark")
    bench.add_argument("--engine", choices=("whisper", "sherpa"), required=True)
    bench.add_argument("--wav", required=True)
    bench.add_argument("--report", required=True)
    bench.add_argument("--reference")
    for name in ("model", "encoder", "decoder", "joiner", "tokens"):
        bench.add_argument("--" + name)
    bench.add_argument("--threads", type=int, choices=range(1, 65), default=2)
    bench.add_argument("--window-seconds", type=positive, default=5)
    bench.add_argument("--replay-paced", action="store_true", help="Release WAV windows at real-time deadlines; no audio playback")
    bench.add_argument("--llm-pid", type=int, help="Actual external LLM worker PID for Windows RAM sampling; requires --with-llm")
    bench.add_argument("--with-llm", action="store_true")
    bench.add_argument("--llm-url", default="http://127.0.0.1:11434/v1")
    bench.add_argument("--llm-model", default="worknote-qwen2.5-1.5b")
    args = parser.parse_args()
    try:
        if args.command == "doctor":
            result = {"hardware": hardware(), "packages": versions(), "llm_url": args.llm_url}
            try:
                result["llm_health"] = request_json(local_url(args.llm_url) + "/models")
            except Exception as error:
                result["llm_health"] = {"status": "unavailable", "reason": str(error)}
            print(json.dumps(result, ensure_ascii=False, indent=2))
        elif args.command == "devices":
            devices()
        elif args.command == "capture":
            capture(args)
        else:
            benchmark(args)
    except (Exception, KeyboardInterrupt) as error:
        print(f"M0 failed: {str(error) or type(error).__name__}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
