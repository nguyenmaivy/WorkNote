"""Compare installed decoders on the same saved audio; no capture/model downloads."""
import argparse
import gc
import json
from pathlib import Path
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.meeting_m0 import read_wav, quality, percentile
from scripts.benchmark_meeting_source import clean
from server.python.meeting_worker import MODEL, WHISPER_MODEL


def main():
    import numpy as np
    import sherpa_onnx
    from faster_whisper import WhisperModel
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('wav', type=Path)
    p.add_argument('reference', type=Path)
    p.add_argument('report', type=Path)
    p.add_argument('--modes', nargs='+', choices=['sherpa-pad300ms', 'sherpa-beam4', 'sherpa-greedy', 'whisper-vi'], default=['sherpa-pad300ms', 'sherpa-beam4', 'whisper-vi'])
    args = p.parse_args()
    if args.report.exists():
        raise ValueError('Report exists')
    samples = read_wav(args.wav)
    reference = clean(args.reference.read_text(encoding='utf-8-sig'))
    report = {'reference_kind': 'uncorrected user TXT; disagreement is not accuracy', 'passes': {}}
    for mode in args.modes:
        if mode.startswith('sherpa'):
            model = sherpa_onnx.OfflineRecognizer.from_transducer(
                encoder=str(MODEL / 'encoder-epoch-12-avg-8.int8.onnx'), decoder=str(MODEL / 'decoder-epoch-12-avg-8.onnx'),
                joiner=str(MODEL / 'joiner-epoch-12-avg-8.int8.onnx'), tokens=str(MODEL / 'tokens.txt'),
                num_threads=2, decoding_method='modified_beam_search' if mode == 'sherpa-beam4' else 'greedy_search', max_active_paths=4)
            def recognize(chunk):
                stream = model.create_stream()
                waveform = np.asarray(chunk, dtype=np.float32) / 32768
                if len(waveform) < 1600:
                    waveform = np.pad(waveform, (0, 1600 - len(waveform)))
                if mode == 'sherpa-pad300ms':
                    waveform = np.pad(waveform, (0, 4800))
                stream.accept_waveform(16000, waveform)
                model.decode_stream(stream)
                return stream.result.text
        else:
            model = WhisperModel(str(WHISPER_MODEL), device='cpu', compute_type='int8', cpu_threads=2, num_workers=1, local_files_only=True)
            def recognize(chunk):
                waveform = np.asarray(chunk, dtype=np.float32) / 32768
                if float(np.sqrt(np.mean(waveform * waveform))) < .001:
                    return ''
                segments, _ = model.transcribe(waveform, language='vi', beam_size=3, condition_on_previous_text=False, vad_filter=False)
                return ' '.join(s.text.strip() for s in segments)
        chunks, durations = [], []
        for offset in range(0, len(samples), 80000):
            started = time.perf_counter()
            text = recognize(samples[offset:offset + 80000])
            durations.append(time.perf_counter() - started)
            chunks.append({'start_seconds': offset / 16000, 'text_raw': text})
        result = {'decode_seconds': sum(durations), 'decode_p95': percentile(durations, .95),
                  'disagreement': quality(reference, clean(' '.join(c['text_raw'] for c in chunks))), 'chunks': chunks}
        report['passes'][mode] = result
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps({'pass': mode, **{k: v for k, v in result.items() if k != 'chunks'}}), flush=True)
        del recognize, model
        gc.collect()


if __name__ == '__main__':
    assert clean('Xin CHÀO!') == 'xin chào'
    main()
