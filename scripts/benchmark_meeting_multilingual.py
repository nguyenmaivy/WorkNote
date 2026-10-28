"""Compare existing local recognizers on a mono PCM16/16k WAV; never downloads models."""
import argparse
import json
from pathlib import Path
import sys
import time
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.meeting_m0 import load_engine, read_wav
from server.python.meeting_worker import MODEL, load_final_recognizer


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('wav', type=Path)
    parser.add_argument('--vocabulary', default='')
    args = parser.parse_args()
    samples = read_wav(args.wav)
    config = SimpleNamespace(engine='sherpa', threads=2, vocabulary=args.vocabulary,
                             encoder=str(MODEL / 'encoder-epoch-12-avg-8.int8.onnx'),
                             decoder=str(MODEL / 'decoder-epoch-12-avg-8.onnx'),
                             joiner=str(MODEL / 'joiner-epoch-12-avg-8.int8.onnx'),
                             tokens=str(MODEL / 'tokens.txt'))
    report = {'audio_seconds': len(samples) / 16000, 'synthetic_or_real': 'caller supplied', 'engines': {}}
    for name, factory in [('sherpa', load_engine), ('whisper', load_final_recognizer)]:
        recognize = factory(config)
        started = time.monotonic()
        chunks = [recognize(samples[offset:offset + 80000]) for offset in range(0, len(samples), 80000)]
        elapsed = time.monotonic() - started
        report['engines'][name] = {'text': ' '.join(chunks), 'decode_seconds': elapsed,
                                   'rtf': elapsed / report['audio_seconds'], 'window_seconds': 5}
    print(json.dumps(report, ensure_ascii=True, indent=2))


if __name__ == '__main__':
    main()
