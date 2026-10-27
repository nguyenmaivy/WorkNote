"""Authorized 180s Windows loopback A/B; stores system audio locally, never opens mic."""
import argparse
from array import array
import audioop
import json
from pathlib import Path
import queue
import sys
import threading
import time
from types import SimpleNamespace
import wave
import winsound

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.meeting_m0 import read_wav, load_engine, quality
from scripts.benchmark_meeting_source import clean
from server.python.meeting_worker import MODEL, pcm_to_mono


def save(path, pcm):
    with wave.open(str(path), 'wb') as wav:
        wav.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'))
        wav.writeframes(pcm)


def lag(reference, captured):
    import numpy as np
    # 1 ms alignment resolution; compare speech after a coarse whole-excerpt correlation.
    a = np.asarray(reference, dtype=np.float64)[::16]
    b = np.asarray(captured, dtype=np.float64)[::16]
    size = 1 << (len(a) + len(b) - 2).bit_length()
    cross = np.fft.irfft(np.fft.rfft(b, size) * np.fft.rfft(a[::-1], size), size)
    valid = cross[len(a) - 1:len(b)]
    return int(np.argmax(valid)) * 16


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('source', type=Path)
    p.add_argument('output', type=Path)
    args = p.parse_args()
    args.output.mkdir(exist_ok=False)
    import numpy as np
    import pyaudiowpatch as pa
    reference = read_wav(args.source)[10 * 16000:190 * 16000]
    if len(reference) != 180 * 16000:
        raise ValueError('Need source covering video seconds 10–190')
    save(args.output / 'playback.wav', reference.tobytes())
    frames = queue.Queue(maxsize=10000)
    overflows = 0
    def callback(data, count, timing, status):
        nonlocal overflows
        try:
            frames.put_nowait((time.monotonic(), data, status))
        except queue.Full:
            overflows += 1
        return None, pa.paContinue
    try:
        with pa.PyAudio() as audio:
            info = audio.get_default_wasapi_loopback()
            rate, channels = int(info['defaultSampleRate']), int(info['maxInputChannels'])
            stream = audio.open(format=pa.paInt16, channels=channels, rate=rate, input=True,
                                input_device_index=int(info['index']), frames_per_buffer=rate // 50,
                                stream_callback=callback, start=False)
            try:
                stream.start_stream()
                time.sleep(.3)
                winsound.PlaySound(str((args.output / 'playback.wav').resolve()), winsound.SND_FILENAME | winsound.SND_ASYNC | winsound.SND_NODEFAULT)
                print('Playing/capturing 180s via ' + info['name'], flush=True)
                time.sleep(181)
                stream.stop_stream()
            finally:
                winsound.PlaySound(None, 0)
                stream.close()
    finally:
        winsound.PlaySound(None, 0)
    items = []
    while not frames.empty():
        items.append(frames.get_nowait())
    if not items:
        raise RuntimeError('No loopback frames')
    # Preserve callback positions rather than silently compressing an idle/drop interval.
    state, parts, gaps = None, [], []
    first = items[0][0]
    cursor = 0
    for timestamp, data, status in items:
        begin = max(0, round((timestamp - first) * 16000))
        if begin > cursor + 1600:
            gaps.append({'start_ms': cursor / 16, 'end_ms': begin / 16})
            parts.append(bytes((begin - cursor) * 2))
            cursor, state = begin, None
        mono = pcm_to_mono(data, channels)
        converted, state = audioop.ratecv(mono.tobytes(), 2, 1, rate, 16000, state)
        parts.append(converted)
        cursor += len(converted) // 2
    pcm = b''.join(parts)
    save(args.output / 'capture-16k.wav', pcm)
    captured = array('h', pcm)
    if len(captured) < len(reference):
        raise RuntimeError('Capture shorter than excerpt; inspect capture-16k.wav')
    offset = lag(reference, captured)
    aligned = captured[offset:offset + len(reference)]
    save(args.output / 'capture-aligned.wav', aligned.tobytes())
    a, b = np.asarray(reference, dtype=np.float64), np.asarray(aligned, dtype=np.float64)
    correlation = float(np.corrcoef(a, b)[0, 1])
    gain = float(np.dot(a, b) / np.dot(a, a))
    report = {'source_offset_seconds': 10, 'seconds': 180, 'device': info,
              'alignment_seconds': offset / 16000, 'waveform_correlation': correlation, 'gain': gain,
              'alignment_validated': False,
              'alignment_warning': 'Coarse constant-delay alignment only; validate drift and tail coverage before interpreting transcript disagreement.',
              'queue_overflows': overflows, 'backend_status_nonzero': sum(bool(x[2]) for x in items),
              'capture_timeline_gaps': gaps,
              'limitations': 'Local winsound default playback vs default WASAPI loopback; may include other apps. 1ms alignment; drift/DSP/resampling can lower correlation. Not the original 60-minute session.',
              'chunks': []}
    config = SimpleNamespace(engine='sherpa', threads=2,
        encoder=str(MODEL / 'encoder-epoch-12-avg-8.int8.onnx'), decoder=str(MODEL / 'decoder-epoch-12-avg-8.onnx'),
        joiner=str(MODEL / 'joiner-epoch-12-avg-8.int8.onnx'), tokens=str(MODEL / 'tokens.txt'))
    recognize = load_engine(config)
    for start in range(0, len(reference), 80000):
        direct = recognize(reference[start:start + 80000])
        capture = recognize(aligned[start:start + 80000])
        report['chunks'].append({'video_start_seconds': 10 + start / 16000, 'direct_raw': direct, 'capture_raw': capture})
    direct = ' '.join(c['direct_raw'] for c in report['chunks'])
    capture = ' '.join(c['capture_raw'] for c in report['chunks'])
    report['capture_vs_direct_disagreement'] = quality(clean(direct), clean(capture))
    report['identical_windows'] = sum(c['direct_raw'] == c['capture_raw'] for c in report['chunks'])
    (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k not in ('chunks', 'device')}, ensure_ascii=True), flush=True)


if __name__ == '__main__':
    assert lag(list(range(1600)), [0] * 160 + list(range(1600)) + [0] * 160) == 160
    main()
