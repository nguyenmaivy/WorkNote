"""Compare already-aligned local WAVs without capture or model changes."""
import argparse
import json
from pathlib import Path
import sys
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.meeting_m0 import load_engine, read_wav, quality
from scripts.benchmark_meeting_source import clean
from server.python.meeting_worker import MODEL


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('directory', type=Path)
    args = p.parse_args()
    target = args.directory / 'drift-pair-score.json'
    if target.exists():
        raise ValueError('Report exists')
    a = read_wav(args.directory / 'direct-175s.wav')
    b = read_wav(args.directory / 'capture-drift-aligned-175s.wav')
    assert len(a) == len(b) == 175 * 16000
    config = SimpleNamespace(engine='sherpa', threads=2,
        encoder=str(MODEL / 'encoder-epoch-12-avg-8.int8.onnx'), decoder=str(MODEL / 'decoder-epoch-12-avg-8.onnx'),
        joiner=str(MODEL / 'joiner-epoch-12-avg-8.int8.onnx'), tokens=str(MODEL / 'tokens.txt'))
    recognize = load_engine(config)
    chunks = [{'video_start_seconds': 10 + i / 16000, 'direct_raw': recognize(a[i:i + 80000]),
               'capture_raw': recognize(b[i:i + 80000])} for i in range(0, len(a), 80000)]
    report = {'seconds': 175, 'alignment_kind': 'exploratory affine checkpoints, not validated waveform match',
              'disagreement': quality(clean(' '.join(c['direct_raw'] for c in chunks)), clean(' '.join(c['capture_raw'] for c in chunks))),
              'identical_windows': sum(c['direct_raw'] == c['capture_raw'] for c in chunks), 'chunks': chunks}
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k != 'chunks'}))


if __name__ == '__main__':
    main()
