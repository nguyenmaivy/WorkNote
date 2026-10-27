"""Refine saved A/B alignment offline; never captures or plays audio."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.meeting_m0 import read_wav


def best_lag(a, b):
    import numpy as np
    size = 1 << (len(a) + len(b) - 2).bit_length()
    correlation = np.fft.irfft(np.fft.rfft(b, size) * np.fft.rfft(a[::-1], size), size)
    valid = correlation[len(a) - 1:len(b)]
    offset = int(np.argmax(np.abs(valid)))
    aligned = b[offset:offset + len(a)]
    return offset, float(np.corrcoef(a, aligned)[0, 1])


def main():
    import numpy as np
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('directory', type=Path)
    args = p.parse_args()
    target = args.directory / 'alignment-check-drift.json'
    if target.exists():
        raise ValueError('Report exists')
    a = np.asarray(read_wav(args.directory / 'playback.wav'), dtype=np.float64)
    b = np.asarray(read_wav(args.directory / 'capture-16k.wav'), dtype=np.float64)
    offset, correlation = best_lag(a, b)
    checkpoints = []
    for second in (10, 60, 120, 170):
        start = second * 16000
        lo = max(0, start + offset - 3200)
        hi = min(len(b), start + offset + 32000 + 3200)
        local, score = best_lag(a[start:start + 32000], b[lo:hi])
        checkpoints.append({'second': second, 'lag_samples': lo + local - start, 'correlation': score})
    # A fixed delay cannot align separate playback/capture clocks over three minutes.
    slope, intercept = np.polyfit([c['second'] * 16000 for c in checkpoints], [c['lag_samples'] for c in checkpoints], 1)
    count = 175 * 16000
    positions = np.arange(count, dtype=np.float64)
    aligned = np.interp(positions * (1 + slope) + intercept, np.arange(len(b)), b)
    from scripts.compare_system_capture import save
    save(args.directory / 'capture-drift-aligned-175s.wav', np.clip(np.rint(aligned), -32768, 32767).astype('<i2').tobytes())
    save(args.directory / 'direct-175s.wav', a[:count].astype('<i2').tobytes())
    report = {'full_resolution_offset_samples': offset, 'offset_seconds': offset / 16000,
              'estimated_clock_drift_ppm': float(slope * 1e6), 'estimated_initial_delay_ms': float(intercept / 16),
              'drift_aligned_correlation_175s': float(np.corrcoef(a[:count], aligned)[0, 1]),
              'limitation': 'Exploratory affine alignment from four checkpoints; last 5s excluded to avoid truncated capture tail. Raw files retained.',
              'full_correlation': correlation, 'local_checkpoints': checkpoints,
              'source_samples': len(a), 'capture_samples': len(b)}
    target.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report), flush=True)


if __name__ == '__main__':
    import numpy as np
    x = np.random.default_rng(42).normal(size=1000)
    assert best_lag(x, np.concatenate((np.zeros(123), x, np.zeros(100))))[0] == 123
    main()
