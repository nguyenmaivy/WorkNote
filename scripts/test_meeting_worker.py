import io
import json
import queue
import sys
import threading
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server.python import meeting_worker as worker


class WorkerTests(unittest.TestCase):
    def test_native_runtime_loaded_before_blocking_command_reader(self):
        loaded = threading.Event()
        model = MagicMock()
        def load(**kwargs):
            self.assertEqual(kwargs['decoding_method'], 'modified_beam_search')
            self.assertEqual(kwargs['max_active_paths'], 4)
            self.assertEqual(kwargs['num_threads'], 2)
            loaded.set()
            return model
        sherpa = SimpleNamespace(OfflineRecognizer=SimpleNamespace(from_transducer=load))
        class Input:
            def __iter__(self):
                if not loaded.is_set():
                    raise RuntimeError('stdin reader started before native runtime')
                yield '{"type":"stop"}\n'
        output = io.StringIO()
        with patch.dict(sys.modules, {'sherpa_onnx': sherpa, 'numpy': MagicMock()}), patch.object(Path, 'is_file', return_value=True), patch.object(worker.sys, 'stdin', Input()), patch.object(worker.sys, 'stdout', output):
            result = worker.run(SimpleNamespace(source='mic', model=worker.MODEL, threads=2))
        self.assertEqual(result, 0)
        self.assertTrue(loaded.is_set())
        self.assertNotIn('error', output.getvalue())

    def test_partial_arrives_before_stop_then_tail_is_finalized(self):
        preview = threading.Event()
        class Input:
            def __iter__(self):
                preview.wait(2)
                yield '{"type":"stop"}\n'
        def capture(_args, frames):
            frames.put((time.monotonic(), bytes(16000)))
            return SimpleNamespace(close=lambda: None), 1, 16000
        events = []
        def emit(kind, **data):
            events.append({'type': kind, **data})
            if kind == 'transcript.partial':
                preview.set()
        with patch.object(worker.sys, 'stdin', Input()), patch.object(worker, 'event', emit):
            result = worker.run(SimpleNamespace(source='mic'), capture, lambda _: 'Xin chào')
        self.assertEqual(result, 0)
        self.assertTrue(preview.is_set())
        types = [e['type'] for e in events]
        self.assertLess(types.index('transcript.partial'), types.index('transcript.final'))
        self.assertEqual(types.count('transcript.final'), 1)
        self.assertEqual(events[-1]['type'], 'stopped')

    def test_whisper_silence_does_not_repeat_vocabulary(self):
        import numpy as np
        model = MagicMock()
        with patch.dict(sys.modules, {'faster_whisper': SimpleNamespace(WhisperModel=lambda *a, **kw: model)}):
            recognize = worker.load_final_recognizer(SimpleNamespace(threads=2, vocabulary='Microsoft, OpenAI'))
            self.assertEqual(recognize(np.zeros(80000, dtype=np.int16)), '')
        model.transcribe.assert_not_called()

    def test_multilingual_final_keeps_fast_sherpa_preview(self):
        preview = threading.Event()
        class Input:
            def __iter__(self):
                preview.wait(2)
                yield '{"type":"stop"}\n'
        def capture(_args, frames):
            frames.put((time.monotonic(), bytes(16000)))
            return SimpleNamespace(close=lambda: None), 1, 16000
        events = []
        def emit(kind, **data):
            events.append({'type': kind, **data})
            if kind == 'transcript.partial':
                preview.set()
        with patch.object(worker.sys, 'stdin', Input()), patch.object(worker, 'event', emit):
            result = worker.run(SimpleNamespace(source='mic'), capture, lambda _: 'mai cờ rô sóp', lambda _: 'Microsoft')
        self.assertEqual(result, 0)
        self.assertEqual(next(e['segment']['text_raw'] for e in events if e['type'] == 'transcript.partial'), 'mai cờ rô sóp')
        self.assertEqual(next(e['segment']['text_raw'] for e in events if e['type'] == 'transcript.final'), 'Microsoft')

    def test_stereo_mix(self):
        from array import array
        self.assertEqual(list(worker.pcm_to_mono(array('h', [1000, -1000, 100, 300]).tobytes(), 2)), [0, 200])

    def test_stop_flushes_queued_tail_and_event_shapes(self):
        payload = bytes(3200)  # 100 ms of mono 16 kHz PCM16
        def capture(_args, frames):
            frames.put((time.monotonic(), payload))
            return SimpleNamespace(start_stream=lambda: None, stop_stream=lambda: None,
                                   is_active=lambda: True, close=lambda: None), 1, 16000
        class Input:
            def __iter__(self):
                time.sleep(0.05)
                yield '{"type":"stop"}\n'
        output = io.StringIO()
        with patch.object(worker.sys, 'stdin', Input()), patch.object(worker.sys, 'stdout', output):
            result = worker.run(SimpleNamespace(source='mic', threads=2, model=worker.MODEL), capture, lambda _: 'ok')
        events = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual(result, 0)
        self.assertEqual(events[0], {"type": "ready"})
        final = next(item for item in events if item['type'] == 'transcript.final')['segment']
        self.assertEqual((final['revision'], final['start_ms'], final['end_ms'], final['text_raw']), (1, final['start_ms'], final['start_ms'] + 100, 'ok'))
        self.assertEqual(events[-1], {"type": "stopped"})

    def test_eof_before_capture_never_opens_stream(self):
        class Input:
            def __iter__(self):
                return
                yield
        calls, output = [], io.StringIO()
        def capture(*_):
            calls.append(True)
            raise AssertionError("capture opened after EOF")
        with patch.object(worker.sys, 'stdin', Input()), patch.object(worker.sys, 'stdout', output):
            result = worker.run(SimpleNamespace(source='mic', threads=2, model=worker.MODEL), capture, lambda _: '')
        self.assertEqual(result, 0)
        self.assertFalse(calls)
        self.assertEqual(json.loads(output.getvalue().splitlines()[-1]), {"type": "stopped"})

    def test_timestamp_gap_splits_windows_and_reports_gap(self):
        payload = bytes(16000 * 2 * 1)  # one second
        def capture(_args, frames):
            base = time.monotonic() - 0.01
            frames.put((base, payload))
            frames.put((base + 1.2, payload))
            return SimpleNamespace(start_stream=lambda: None, stop_stream=lambda: None,
                                   is_active=lambda: True, close=lambda: None), 1, 16000
        class Input:
            def __iter__(self):
                time.sleep(0.05)
                yield '{"type":"stop"}\n'
        output = io.StringIO()
        with patch.object(worker.sys, 'stdin', Input()), patch.object(worker.sys, 'stdout', output):
            result = worker.run(SimpleNamespace(source='system', threads=2, model=worker.MODEL), capture, lambda _: 'speech')
        events = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual(result, 0)
        self.assertTrue(any(e['type'] == 'gap' and e['reason'] == 'capture_timeline_gap' for e in events))
        segments = [e['segment'] for e in events if e['type'] == 'transcript.final']
        self.assertEqual(len(segments), 2)
        self.assertGreater(segments[1]['start_ms'], segments[0]['end_ms'])

    def test_slow_decode_does_not_block_capture_or_live_transcript(self):
        decoding, consumed, live = threading.Event(), threading.Event(), threading.Event()
        payload = bytes(640)  # 20 ms at 16 kHz
        producers = []
        def capture(_args, frames):
            base = time.monotonic()
            frames.put((base, bytes(worker.WINDOW * 2)))
            def produce():
                if not decoding.wait(2):
                    return
                for i in range(150):
                    frames.put((base + 5 + i * .02, payload), timeout=2)
                # The final marker must be consumed while decode is still blocked.
                frames.put((base + 8, payload), timeout=2)
            producer = threading.Thread(target=produce)
            producers.append(producer)
            producer.start()
            return SimpleNamespace(close=lambda: None), 1, 16000
        def recognize(samples):
            if len(samples) == worker.WINDOW:
                decoding.set()
                if not consumed.wait(2):
                    raise RuntimeError('capture blocked behind inference')
            return 'Tiếng Việt đầy đủ'
        class Input:
            def __iter__(self):
                live.wait(4)
                yield '{"type":"stop"}\n'
        events = []
        def emit(kind, **data):
            events.append({'type': kind, **data})
            if kind == 'transcript.final':
                live.set()
        original_mix = worker.pcm_to_mono
        count = 0
        def mix(data, channels):
            nonlocal count
            count += 1
            if count == 152:
                consumed.set()
            return original_mix(data, channels)
        with patch.object(worker.sys, 'stdin', Input()), patch.object(worker, 'event', emit), patch.object(worker, 'pcm_to_mono', mix):
            result = worker.run(SimpleNamespace(source='system', threads=2, model=worker.MODEL), capture, recognize)
        for producer in producers:
            producer.join(3)
        self.assertEqual(result, 0)
        self.assertTrue(consumed.is_set())
        self.assertTrue(live.is_set())
        segments = [e['segment'] for e in events if e['type'] == 'transcript.final']
        self.assertEqual(len(segments), 2)
        self.assertEqual(segments[0]['end_ms'], segments[1]['start_ms'])
        self.assertEqual(segments[1]['end_ms'] - segments[0]['start_ms'], 8020)
        self.assertFalse(any(e['type'] in ('error', 'gap') for e in events))
        self.assertEqual(events[-1]['type'], 'stopped')

    def test_bounded_decode_backlog_fails_explicitly(self):
        release, finished = threading.Event(), threading.Event()
        class Input:
            def __iter__(self):
                finished.wait(3)
                yield '{"type":"stop"}\n'
        def capture(_args, frames):
            base = time.monotonic()
            for i in range(5):
                frames.put((base + i * 5, bytes(worker.WINDOW * 2)))
            return SimpleNamespace(close=lambda: None), 1, 16000
        def recognize(_samples):
            release.wait(3)
            return 'speech'
        events = []
        def emit(kind, **data):
            events.append({'type': kind, **data})
            if kind == 'error':
                release.set()
                finished.set()
        with patch.object(worker.sys, 'stdin', Input()), patch.object(worker, 'event', emit):
            result = worker.run(SimpleNamespace(source='mic'), capture, recognize)
        self.assertEqual(result, 1)
        self.assertTrue(any(e['type'] == 'gap' and 'backlog' in e['reason'] for e in events))
        self.assertEqual(events[-1]['type'], 'error')
        self.assertFalse(any(e['type'] == 'stopped' for e in events))

    def test_recognizer_error_is_not_reported_as_success(self):
        class Input:
            def __iter__(self):
                time.sleep(.05)
                yield '{"type":"stop"}\n'
        def capture(_args, frames):
            frames.put((time.monotonic(), bytes(3200)))
            return SimpleNamespace(close=lambda: None), 1, 16000
        def recognize(_samples):
            raise RuntimeError('decoder failed')
        output = io.StringIO()
        with patch.object(worker.sys, 'stdin', Input()), patch.object(worker.sys, 'stdout', output):
            result = worker.run(SimpleNamespace(source='mic'), capture, recognize)
        events = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual(result, 1)
        self.assertEqual(events[-1], {'type': 'error', 'message': 'decoder failed'})
        self.assertFalse(any(e['type'] == 'stopped' for e in events))

    def test_capture_overflow_reports_loss_and_closes_stream(self):
        finished = threading.Event()
        stream = SimpleNamespace(close=MagicMock())
        class Input:
            def __iter__(self):
                finished.wait(2)
                yield '{"type":"stop"}\n'
        def capture(_args, frames):
            frames.put((time.monotonic(), bytes(3200), True))
            return stream, 1, 16000
        events = []
        def emit(kind, **data):
            events.append({'type': kind, **data})
            if kind == 'error':
                finished.set()
        with patch.object(worker.sys, 'stdin', Input()), patch.object(worker, 'event', emit):
            result = worker.run(SimpleNamespace(source='mic'), capture, lambda _: 'speech')
        self.assertEqual(result, 1)
        self.assertTrue(any(e['type'] == 'gap' and 'overflow' in e['reason'].lower() for e in events))
        self.assertEqual(events[-1]['type'], 'error')
        self.assertFalse(any(e['type'] == 'stopped' for e in events))
        stream.close.assert_called_once()

    def test_invalid_command_is_reported(self):
        class Input:
            def __iter__(self):
                yield '{"type":"start"}\n'
        output, stderr = io.StringIO(), io.StringIO()
        def capture(_args, _frames):
            return SimpleNamespace(start_stream=lambda: None, stop_stream=lambda: None,
                                   is_active=lambda: True, close=lambda: None), 1, 16000
        with patch.object(worker.sys, 'stdin', Input()), patch.object(worker.sys, 'stdout', output), patch.object(worker.sys, 'stderr', stderr):
            result = worker.run(SimpleNamespace(source='mic', threads=2, model=worker.MODEL), capture, lambda _: '')
        self.assertEqual(result, 1)
        self.assertEqual(json.loads(output.getvalue().splitlines()[-1])['type'], 'error')


if __name__ == '__main__':
    unittest.main()
