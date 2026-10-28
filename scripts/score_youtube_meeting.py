"""Score a captured excerpt against YouTube ASR; disagreement is not ground-truth accuracy."""
import argparse
import json
from pathlib import Path
import re
import sys
import time
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.meeting_m0 import load_engine, read_wav, quality
from server.python.meeting_worker import MODEL, load_final_recognizer


def clean(text):
    return ' '.join(re.findall(r'[^\W_]+', re.sub(r'\[[^]]*\]', '', text).casefold(), re.UNICODE))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('wav', type=Path)
    parser.add_argument('reference', type=Path)
    parser.add_argument('report', type=Path)
    args = parser.parse_args()
    if args.report.exists():
        raise ValueError('Choose a new report path')
    samples = read_wav(args.wav)
    seconds = len(samples) / 16000
    captions = json.loads(args.reference.read_text(encoding='utf-8'))
    reference = ' '.join(c['text'] for c in captions['segments'] if c['start'] < seconds)
    config = SimpleNamespace(engine='sherpa', threads=2, vocabulary='',
        encoder=str(MODEL / 'encoder-epoch-12-avg-8.int8.onnx'), decoder=str(MODEL / 'decoder-epoch-12-avg-8.onnx'),
        joiner=str(MODEL / 'joiner-epoch-12-avg-8.int8.onnx'), tokens=str(MODEL / 'tokens.txt'))
    report = {'seconds': seconds, 'video': 'V2Rj-tplz0Y', 'reference_kind': 'Vietnamese auto-generated',
              'reference': reference, 'vocabulary': '', 'engines': {},
              'limitations': 'First two minutes only. YouTube ASR is fallible. Whitespace-token WER is not Vietnamese linguistic word segmentation. Captured video stream may have boundary offset. Offline windows exclude live capture and formatting latency.'}
    for name, factory in [('sherpa', load_engine), ('whisper', load_final_recognizer)]:
        recognize = factory(config)
        started = time.monotonic()
        chunks = [{'start': i / 16000, 'text': recognize(samples[i:i+80000])} for i in range(0, len(samples), 80000)]
        elapsed = time.monotonic() - started
        text = ' '.join(c['text'] for c in chunks)
        report['engines'][name] = {'text': text, 'chunks': chunks, 'compute_seconds': elapsed,
            'rtf': elapsed / seconds, 'youtube_disagreement': quality(clean(reference), clean(text))}
        print(name, round(elapsed, 2), report['engines'][name]['youtube_disagreement'], flush=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    assert clean('Xin CHÀO! [âm nhạc]') == 'xin chào'
    main()
