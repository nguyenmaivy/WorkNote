"""Measure window-boundary sensitivity without changing the production worker."""
import argparse
import json
from pathlib import Path
import sys
import time
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.meeting_m0 import load_engine, read_wav, quality
from scripts.benchmark_meeting_source import clean
from server.python.meeting_worker import MODEL


def boundaries(count, shift):
    return [0] + list(range(shift, count, 80000)) + [count]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('wav', type=Path)
    p.add_argument('reference', type=Path)
    p.add_argument('output', type=Path)
    args = p.parse_args()
    if args.output.exists():
        raise ValueError('Use a new report path')
    samples = read_wav(args.wav)
    reference = clean(args.reference.read_text(encoding='utf-8-sig'))
    config = SimpleNamespace(engine='sherpa', threads=2,
        encoder=str(MODEL / 'encoder-epoch-12-avg-8.int8.onnx'),
        decoder=str(MODEL / 'decoder-epoch-12-avg-8.onnx'),
        joiner=str(MODEL / 'joiner-epoch-12-avg-8.int8.onnx'), tokens=str(MODEL / 'tokens.txt'))
    recognize = load_engine(config)
    report = {}
    for shift in (0.5, 1.0, 2.5):
        edges = boundaries(len(samples), int(shift * 16000))
        started = time.perf_counter()
        chunks = [{'start': a / 16000, 'end': b / 16000, 'text_raw': recognize(samples[a:b])}
                  for a, b in zip(edges, edges[1:])]
        result = {'decode_seconds': time.perf_counter() - started,
                  'reference_disagreement': quality(reference, clean(' '.join(c['text_raw'] for c in chunks))),
                  'chunks': chunks}
        report[str(shift)] = result
        print(shift, result['reference_disagreement'], flush=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    assert boundaries(180000, 8000) == [0, 8000, 88000, 168000, 180000]
    main()
