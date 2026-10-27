"""Local Sherpa meeting capture worker; JSONL events on stdout, diagnostics on stderr."""
import argparse
from array import array
from collections import deque
from concurrent.futures import ThreadPoolExecutor
import audioop
import json
import math
import queue
import sys
import threading
import time
import uuid
from pathlib import Path

MODEL = Path(__file__).resolve().parents[2] / "models" / "stt" / "sherpa-vi-int8-20250420"
WHISPER_MODEL = MODEL.parent / "whisper-base-ct2"
WINDOW = 5 * 16000


def load_final_recognizer(args):
    import numpy as np
    from faster_whisper import WhisperModel
    model = WhisperModel(str(WHISPER_MODEL), device="cpu", compute_type="int8",
                         cpu_threads=args.threads, num_workers=1, local_files_only=True)

    def recognize(samples):
        waveform = np.asarray(samples, dtype=np.float32) / 32768
        # Avoid prompt hallucinations and expensive decoding on near-digital silence.
        if len(waveform) == 0 or float(np.sqrt(np.mean(waveform * waveform))) < 0.001:
            return ""
        segments, _ = model.transcribe(
            waveform, task="transcribe",
            language=None, beam_size=3, condition_on_previous_text=False,
            initial_prompt=args.vocabulary or None, vad_filter=False)
        return " ".join(segment.text.strip() for segment in segments)
    return recognize


def event(kind, **data):
    print(json.dumps({"type": kind, **data}, ensure_ascii=False, allow_nan=False), flush=True)


def pcm_to_mono(data, channels):
    samples = array("h", data)
    if sys.byteorder != "little":
        samples.byteswap()
    if channels == 1:
        return samples
    return array("h", (sum(samples[i:i + channels]) // channels
                        for i in range(0, len(samples), channels)))


def run(args, capture_factory=None, recognizer_factory=None, final_recognizer_factory=None):
    stop = threading.Event()
    frames = queue.Queue(maxsize=100)
    errors = []
    dropped = threading.Event()

    def commands():
        try:
            for line in sys.stdin:
                if len(line) > 4096:
                    raise ValueError("command exceeds 4096 bytes")
                command = json.loads(line)
                if not isinstance(command, dict) or command.get("type") != "stop":
                    raise ValueError("expected stop command")
                stop.set()
                return
        except Exception as exc:
            errors.append(exc)
        finally:
            stop.set()

    command_thread = threading.Thread(target=commands, daemon=True)
    stream = audio = backend = decoder = None
    try:
        if recognizer_factory is None:
            import numpy as np
            import sherpa_onnx
            for name in ("encoder-epoch-12-avg-8.int8.onnx", "decoder-epoch-12-avg-8.onnx",
                         "joiner-epoch-12-avg-8.int8.onnx", "tokens.txt"):
                if not (args.model / name).is_file():
                    raise FileNotFoundError(f"missing local model file: {args.model / name}")
            recognizer = sherpa_onnx.OfflineRecognizer.from_transducer(
                encoder=str(args.model / "encoder-epoch-12-avg-8.int8.onnx"),
                decoder=str(args.model / "decoder-epoch-12-avg-8.onnx"),
                joiner=str(args.model / "joiner-epoch-12-avg-8.int8.onnx"),
                tokens=str(args.model / "tokens.txt"), num_threads=args.threads,
                sample_rate=16000, feature_dim=80, decoding_method="modified_beam_search", max_active_paths=4)
            def recognize(samples):
                waveform = np.asarray(samples, dtype=np.float32) / 32768
                if len(waveform) < 1600:
                    waveform = np.pad(waveform, (0, 1600 - len(waveform)))
                decoder_stream = recognizer.create_stream()
                decoder_stream.accept_waveform(16000, waveform)
                recognizer.decode_stream(decoder_stream)
                return decoder_stream.result.text
        else:
            recognize = recognizer_factory
        recognize_final = final_recognizer_factory or (load_final_recognizer(args) if getattr(args, 'final_engine', 'sherpa') == 'whisper' else recognize)
        # Load native runtimes before a Windows stdin reader can hold their startup lock.
        command_thread.start()
        if errors:
            raise errors[0]
        if stop.is_set():
            event("stopped")
            return 0
        if capture_factory is None:
            import pyaudiowpatch as pa
            backend = pa
            audio = pa.PyAudio()
            info = (audio.get_default_input_device_info() if args.source == "mic"
                    else audio.get_default_wasapi_loopback()) if args.device is None else audio.get_device_info_by_index(args.device)
            if bool(info.get("isLoopbackDevice", False)) != (args.source == "system"):
                raise ValueError("selected device does not match requested source")
            channels, rate = int(info["maxInputChannels"]), int(info["defaultSampleRate"])
            if channels < 1 or rate <= 0:
                raise ValueError("selected device has no usable input")
            def callback(data, count, _timing, status):
                timestamp = time.monotonic()
                try:
                    frames.put_nowait((timestamp, data, bool(status & pa.paInputOverflow)))
                except queue.Full:
                    dropped.set()
                return None, pa.paContinue
            stream = audio.open(format=pa.paInt16, channels=channels, rate=rate, input=True,
                                input_device_index=int(info["index"]), frames_per_buffer=max(1, rate // 50),
                                stream_callback=callback, start=False)
        else:
            stream, channels, rate = capture_factory(args, frames)
        if stop.is_set():
            event("stopped")
            return 0
        started = time.monotonic()
        if backend:
            stream.start_stream()
        event("ready")
        decoder = ThreadPoolExecutor(max_workers=1)
        pending = deque()

        def publish_completed(wait=False):
            while pending and (wait or pending[0][0].done()):
                future, begin, end, final = pending.popleft()
                text = future.result().strip()
                if text or not final:
                    event("transcript.final" if final else "transcript.partial", segment={"id": str(uuid.uuid4()), "revision": 1,
                          "start_ms": begin * 1000 // 16000, "end_ms": end * 1000 // 16000,
                          "source": args.source, "text_raw": text})

        def submit(samples, begin, end, final=True):
            publish_completed()
            if not final and pending:
                return
            if len(pending) >= 4:
                event("gap", start_ms=begin * 1000 // 16000, end_ms=end * 1000 // 16000,
                      reason="Transcription backlog full; capture stopped")
                raise RuntimeError("Transcription cannot keep up with capture")
            pending.append((decoder.submit(recognize_final if final else recognize, samples), begin, end, final))

        samples, resample_state = array("h"), None
        audio_cursor = 0
        active_start = None
        last_meter = 0.0
        capture_end = None
        last_preview = 0
        while True:
            publish_completed()
            if dropped.is_set():
                event("gap", start_ms=0, end_ms=int((time.monotonic() - started) * 1000), reason="Audio queue overflow; capture stopped to prevent silent loss")
                raise RuntimeError("Audio queue overflow")
            if errors:
                raise errors[0]
            if stop.is_set() and capture_end is None:
                if backend and stream.is_active():
                    stream.stop_stream()
                capture_end = time.monotonic()
            if stop.is_set() and frames.empty():
                break
            try:
                item = frames.get(timeout=0.05)
            except queue.Empty:
                if backend and not stop.is_set() and not stream.is_active():
                    raise RuntimeError("capture stream stopped unexpectedly")
                continue
            timestamp, data, *overflow = item
            if overflow and overflow[0]:
                event("gap", start_ms=audio_cursor * 1000 // 16000, end_ms=max(audio_cursor * 1000 // 16000, int((timestamp - started) * 1000)), reason="Capture backend overflow; lost duration unknown")
                raise RuntimeError("Capture backend overflow")
            frame_offset = max(0, int((timestamp - started) * 16000))
            if frame_offset > audio_cursor + 1600:
                if samples:
                    submit(samples, active_start, audio_cursor)
                    samples = array("h")
                event("gap", start_ms=audio_cursor * 1000 // 16000,
                      end_ms=frame_offset * 1000 // 16000, reason="capture_timeline_gap")
                active_start, resample_state = None, None
            if active_start is None:
                active_start = frame_offset
                audio_cursor = frame_offset
            mono = pcm_to_mono(data, channels)
            converted, resample_state = audioop.ratecv(mono.tobytes(), 2, 1, rate, 16000, resample_state)
            chunk = array("h", converted)
            if sys.byteorder != "little":
                chunk.byteswap()
            samples.extend(chunk)
            audio_cursor += len(chunk)
            while len(samples) >= WINDOW:
                window = samples[:WINDOW]
                del samples[:WINDOW]
                submit(window, active_start, active_start + WINDOW)
                active_start += WINDOW
            # shortcut: re-decode offline context; use a streaming checkpoint if preview CPU or latency becomes excessive.
            if not stop.is_set() and len(samples) >= 8000 and audio_cursor - last_preview >= 8000:
                submit(samples[:], active_start, audio_cursor, final=False)
                last_preview = audio_cursor
            if timestamp - last_meter >= 0.2:
                event("meter", level=min(1.0, math.sqrt(sum(x*x for x in mono) / max(1, len(mono))) / 32768))
                last_meter = timestamp
        if errors:
            raise errors[0]
        if samples:
            submit(samples, active_start, audio_cursor)
        publish_completed(wait=True)
        end_ms = int(((capture_end or time.monotonic()) - started) * 1000)
        if end_ms > audio_cursor * 1000 // 16000 + 100:
            event("gap", start_ms=audio_cursor * 1000 // 16000, end_ms=end_ms,
                  reason="No captured frames; loopback may be idle or device coverage unavailable")
        event("stopped")
        return 0
    except Exception as exc:
        print(f"meeting worker: {str(exc) or type(exc).__name__}", file=sys.stderr, flush=True)
        event("error", message=str(exc) or type(exc).__name__)
        return 1
    finally:
        stop.set()
        if stream is not None:
            try:
                if backend and stream.is_active():
                    stream.stop_stream()
                stream.close()
            except Exception:
                pass
        if audio is not None:
            try:
                audio.terminate()
            except Exception:
                pass
        if decoder is not None:
            decoder.shutdown(wait=True, cancel_futures=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--devices", action="store_true")
    parser.add_argument("--source", choices=("mic", "system"))
    parser.add_argument("--device", type=int)
    parser.add_argument("--model", type=Path, default=MODEL)
    parser.add_argument("--threads", type=int, default=2)
    parser.add_argument("--final-engine", choices=("sherpa", "whisper"), default="sherpa")
    parser.add_argument("--vocabulary", default="")
    args = parser.parse_args()
    if len(args.vocabulary) > 1000:
        parser.error("vocabulary exceeds 1000 characters")
    if args.devices:
        try:
            import pyaudiowpatch as pa
            with pa.PyAudio() as audio:
                devices = []
                for index in range(audio.get_device_count()):
                    info = audio.get_device_info_by_index(index)
                    if info.get("maxInputChannels", 0):
                        devices.append({"index": index, "name": info["name"],
                                        "source": "system" if info.get("isLoopbackDevice") else "mic"})
                print(json.dumps({"devices": devices}, ensure_ascii=False), flush=True)
            return 0
        except Exception as exc:
            print(f"meeting worker: {str(exc) or type(exc).__name__}", file=sys.stderr, flush=True)
            return 1
    if not args.source or not 1 <= args.threads <= 64 or (args.device is not None and args.device < 0):
        parser.error("source required; threads/device are out of range")
    return run(args)


if __name__ == "__main__":
    sys.exit(main())
