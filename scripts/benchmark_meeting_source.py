"""Local audio comparison; raw reference disagreement is not ground-truth accuracy."""
import argparse
from array import array
import gc
import hashlib
import json
from pathlib import Path
import re
import sys
import time
from types import SimpleNamespace
import unicodedata
import wave

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.meeting_m0 import load_engine, percentile, quality
from server.python.meeting_worker import MODEL, load_final_recognizer


def clean(text):
    return ' '.join(re.findall(r'[^\W_]+', unicodedata.normalize('NFC', text).casefold()))


def schedule(durations, window):
    finish, waits = 0.0, []
    for i, duration in enumerate(durations):
        arrival = (i + 1) * window
        waits.append(max(0, finish - arrival))
        finish = max(finish, arrival) + duration
    return {'mode': 'modeled serial arrivals from measured decode times, not live capture',
            'max_wait_seconds': max(waits, default=0), 'last_wait_seconds': waits[-1] if waits else 0}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('source', type=Path)
    p.add_argument('reference', type=Path)
    p.add_argument('output', type=Path)
    args = p.parse_args()
    args.output.mkdir(exist_ok=False)
    import av
    import numpy as np
    resampler = av.AudioResampler(format='s16', layout='mono', rate=16000)
    pcm = bytearray()
    with av.open(str(args.source)) as container:
        for frame in container.decode(audio=0):
            for converted in resampler.resample(frame):
                pcm.extend(converted.to_ndarray().astype('<i2', copy=False).tobytes())
        for converted in resampler.resample(None):
            pcm.extend(converted.to_ndarray().astype('<i2', copy=False).tobytes())
    samples = array('h', pcm)
    if sys.byteorder != 'little':
        samples.byteswap()
    if not 180 <= len(samples) / 16000 <= 900:
        raise ValueError('Expected 3–15 minutes of source audio')
    with wave.open(str(args.output / 'source-16k.wav'), 'wb') as wav:
        wav.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'))
        wav.writeframes(pcm)
    reference = args.reference.read_text(encoding='utf-8-sig')
    config = SimpleNamespace(engine='sherpa', threads=2, vocabulary='',
        encoder=str(MODEL / 'encoder-epoch-12-avg-8.int8.onnx'),
        decoder=str(MODEL / 'decoder-epoch-12-avg-8.onnx'),
        joiner=str(MODEL / 'joiner-epoch-12-avg-8.int8.onnx'), tokens=str(MODEL / 'tokens.txt'))
    report = {'source': str(args.source), 'sha256': hashlib.sha256(args.source.read_bytes()).hexdigest(),
              'audio_seconds': len(samples) / 16000, 'threads': 2,
              'reference_kind': 'user supplied uncorrected TXT, full video; not ground truth',
              'limitations': 'No live capture, LLM contention, previews or RAM measurement. Queue model excludes these costs. Different window sizes also change auto language detection context.',
              'engines': {}}
    for name, factory in [('sherpa', load_engine), ('whisper', load_final_recognizer)]:
        started = time.perf_counter()
        recognize = factory(config)
        load_seconds = time.perf_counter() - started
        for window in (5, 15):
            chunks, durations = [], []
            for offset in range(0, len(samples), window * 16000):
                started = time.perf_counter()
                text = recognize(samples[offset:offset + window * 16000])
                elapsed = time.perf_counter() - started
                durations.append(elapsed)
                chunks.append({'start_seconds': offset / 16000, 'end_seconds': min(len(samples), offset + window * 16000) / 16000,
                               'decode_seconds': elapsed, 'text_raw': text})
            text = ' '.join(c['text_raw'] for c in chunks)
            score = quality(clean(reference), clean(text))
            result = {'load_seconds': load_seconds, 'decode_seconds': sum(durations),
                      'rtf': sum(durations) / report['audio_seconds'],
                      'decode_p50': percentile(durations, .5), 'decode_p95': percentile(durations, .95),
                      'decode_max': max(durations), 'reference_disagreement': score,
                      'queue_model': schedule(durations, window), 'chunks': chunks}
            report['engines'][f'{name}-{window}s'] = result
            (args.output / f'{name}-{window}s.txt').write_text(text, encoding='utf-8')
            (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
            print(json.dumps({'pass': f'{name}-{window}s', **{k: v for k, v in result.items() if k != 'chunks'}}, ensure_ascii=True), flush=True)
        del recognize
        gc.collect()


if __name__ == '__main__':
    assert clean('Xin CHÀO! 20%') == 'xin chào 20'
    assert schedule([1, 1], 5)['max_wait_seconds'] == 0
    assert schedule([7, 7], 5)['max_wait_seconds'] == 2
    main()
