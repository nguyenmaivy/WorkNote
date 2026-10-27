"""Replay 180 seconds through the production worker with fake capture, no microphone."""
import argparse
import ctypes
from ctypes import wintypes
import json
from pathlib import Path
import queue
import sys
import threading
import time
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.meeting_m0 import read_wav, percentile
from server.python import meeting_worker as worker


class MemoryCounters(ctypes.Structure):
    _fields_ = [('cb', wintypes.DWORD), ('PageFaultCount', wintypes.DWORD),
                *[(name, ctypes.c_size_t) for name in ('PeakWorkingSetSize', 'WorkingSetSize', 'QuotaPeakPagedPoolUsage', 'QuotaPagedPoolUsage', 'QuotaPeakNonPagedPoolUsage', 'QuotaNonPagedPoolUsage', 'PagefileUsage', 'PeakPagefileUsage')]]


def rss():
    counters = MemoryCounters()
    counters.cb = ctypes.sizeof(counters)
    handle = ctypes.windll.kernel32.GetCurrentProcess
    handle.restype = wintypes.HANDLE
    get_memory = ctypes.windll.psapi.GetProcessMemoryInfo
    get_memory.argtypes = [wintypes.HANDLE, ctypes.POINTER(MemoryCounters), wintypes.DWORD]
    if not get_memory(handle(), ctypes.byref(counters), counters.cb):
        raise ctypes.WinError()
    return counters.WorkingSetSize


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('wav', type=Path)
    p.add_argument('engine', choices=['sherpa', 'whisper'])
    p.add_argument('report', type=Path)
    args = p.parse_args()
    if args.report.exists():
        raise ValueError('Use a new report path')
    pcm = read_wav(args.wav)[:180 * 16000].tobytes()
    if len(pcm) != 180 * 32000:
        raise ValueError('Need at least 180 seconds')
    complete = threading.Event()
    producers, events, ages, sizes = [], [], [], []
    started = None
    peak_queue = overflows = 0

    class Input:
        def __iter__(self):
            complete.wait()
            yield '{"type":"stop"}\n'

    def capture(_args, frames):
        nonlocal started
        started = time.monotonic()
        def produce():
            nonlocal peak_queue, overflows
            try:
                for offset in range(0, len(pcm), 640):
                    target = started + offset / 32000
                    complete.wait(max(0, target - time.monotonic()))
                    try:
                        frames.put_nowait((time.monotonic(), pcm[offset:offset + 640]))
                    except queue.Full:
                        overflows += 1
                    peak_queue = max(peak_queue, frames.qsize())
                    if offset % 32000 == 0:
                        sizes.append(rss())
            finally:
                complete.set()
        thread = threading.Thread(target=produce)
        producers.append(thread)
        thread.start()
        return SimpleNamespace(close=complete.set), 1, 16000

    def emit(kind, **data):
        if kind == 'transcript.final':
            ages.append(max(0, time.monotonic() - started - data['segment']['end_ms'] / 1000))
        if kind != 'meter':
            events.append({'type': kind, **data})
        if kind == 'error':
            complete.set()

    config = SimpleNamespace(source='system', model=worker.MODEL, threads=2, device=None, final_engine=args.engine, vocabulary='')
    begin = time.monotonic()
    with patch.object(worker.sys, 'stdin', Input()), patch.object(worker, 'event', emit):
        result = worker.run(config, capture)
    for thread in producers:
        thread.join()
    report = {'engine': args.engine, 'seconds': 180, 'offset_video_seconds': 0, 'exit_code': result,
              'wall_seconds_including_model_load': time.monotonic() - begin,
              'capture_queue_peak_frames': peak_queue, 'capture_queue_overflows': overflows,
              'final_age_p50_seconds': percentile(ages, .5), 'final_age_p95_seconds': percentile(ages, .95),
              'final_age_max_seconds': max(ages, default=None),
              'ram_peak_sampled_bytes': max(sizes, default=None),
              'limitations': 'Paced file replay through production Python worker including previews; no WASAPI, Node/SQLite/UI or concurrent LLM. Queue peak is capture queue, not inference queue.',
              'events': events}
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k != 'events'}, ensure_ascii=True), flush=True)


if __name__ == '__main__':
    assert rss() > 0
    main()
