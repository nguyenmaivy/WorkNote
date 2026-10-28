"""Capture a playing YouTube excerpt via WASAPI and compare 5s STT windows to its ASR captions."""
import argparse
import audioop
import json
from pathlib import Path
import subprocess
import sys
import time
import urllib.request
import wave
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.meeting_m0 import load_engine, read_wav, quality
from server.python.meeting_worker import MODEL, load_final_recognizer, pcm_to_mono


def browser(code):
    result = subprocess.run(['cmd', '/c', 'playwright-cli', 'run-code', code], capture_output=True, text=True, timeout=30)
    if result.returncode or '### Error' in result.stdout:
        raise RuntimeError(result.stdout + result.stderr)
    return result.stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('--seconds', type=int, default=120)
    args = parser.parse_args()
    if not 10 <= args.seconds <= 660:
        parser.error('seconds must be 10..660')
    args.output.mkdir(parents=True, exist_ok=False)
    request = urllib.request.Request('http://localhost:3000/api/youtube-transcript',
        data=json.dumps({'url': 'https://youtu.be/V2Rj-tplz0Y', 'lang': 'vi'}).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=30) as response:
        captions = json.load(response)
    (args.output / 'youtube-reference.json').write_text(json.dumps(captions, ensure_ascii=False, indent=2), encoding='utf-8')
    import pyaudiowpatch as pa
    with pa.PyAudio() as audio:
        info = audio.get_default_wasapi_loopback()
        rate, channels = int(info['defaultSampleRate']), int(info['maxInputChannels'])
        stream = audio.open(format=pa.paInt16, channels=channels, rate=rate, input=True,
                            input_device_index=int(info['index']), frames_per_buffer=rate // 10, start=False)
        try:
            browser("async page => { await page.evaluate(()=>{const p=document.getElementById('movie_player');p.seekTo(0,true);p.playVideo();}); }")
            stream.start_stream()
            chunks = []
            for _ in range(args.seconds * 10):
                chunks.append(stream.read(rate // 10, exception_on_overflow=True))
            stream.stop_stream()
        finally:
            stream.close()
            browser("async page => { return await page.evaluate(()=>{const p=document.getElementById('movie_player');p.pauseVideo();return {end:p.getCurrentTime(),audio:p.getAudioTrack().Mb.name};}); }")
    mono = pcm_to_mono(b''.join(chunks), channels)
    pcm, _ = audioop.ratecv(mono.tobytes(), 2, 1, rate, 16000, None)
    wav = args.output / 'capture.wav'
    with wave.open(str(wav), 'wb') as output:
        output.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'))
        output.writeframes(pcm)
    samples = read_wav(wav)
    reference = ' '.join(c['text'] for c in captions['segments'] if 0 <= c['start'] < args.seconds)
    config = SimpleNamespace(engine='sherpa', threads=2, vocabulary='',
        encoder=str(MODEL / 'encoder-epoch-12-avg-8.int8.onnx'), decoder=str(MODEL / 'decoder-epoch-12-avg-8.onnx'),
        joiner=str(MODEL / 'joiner-epoch-12-avg-8.int8.onnx'), tokens=str(MODEL / 'tokens.txt'))
    report = {'video_id': 'V2Rj-tplz0Y', 'seconds': args.seconds, 'reference_kind': 'YouTube Vietnamese auto-generated',
              'reference': reference, 'limitations': 'WASAPI playback capture; startup offset and buffering may affect alignment. YouTube ASR is not ground truth. No vocabulary hints supplied.', 'engines': {}}
    for name, factory in [('sherpa', load_engine), ('whisper', load_final_recognizer)]:
        recognize = factory(config)
        started = time.monotonic()
        chunks = [{'start': i / 16000, 'text': recognize(samples[i:i+80000])} for i in range(0, len(samples), 80000)]
        elapsed = time.monotonic() - started
        text = ' '.join(c['text'] for c in chunks)
        report['engines'][name] = {'text': text, 'chunks': chunks, 'compute_seconds': elapsed,
                                   'rtf': elapsed / args.seconds, 'youtube_disagreement': quality(reference, text)}
        print(name, 'seconds', round(elapsed, 2), 'disagreement', report['engines'][name]['youtube_disagreement'], flush=True)
    (args.output / 'comparison.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Saved', args.output / 'comparison.json')


if __name__ == '__main__':
    main()
