"""Gentle, upbeat background music bed for the demo video (synthesised, royalty-free).

I-V-vi-IV in D major at 96 bpm: warm pad, plucked arpeggio, soft bass and a light shaker.
usage: python3 -I tools/music.py SECONDS out/music.wav
"""
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter

SR = 44100
BPM = 96
BEAT = 60 / BPM
rng = np.random.default_rng(7)


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


def pluck(f, dur, amp):
    t = np.arange(int(dur * SR)) / SR
    env = np.exp(-t * 5.5) * (1 - np.exp(-t * 400))
    w = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    return amp * env * w


def pad(freqs, dur, amp):
    t = np.arange(int(dur * SR)) / SR
    env = np.minimum(1, t / 1.2) * np.minimum(1, (dur - t) / 1.0).clip(0, 1)
    w = sum(np.sin(2 * np.pi * f * t * d + rng.uniform(0, 6)) for f in freqs for d in (0.997, 1.003))
    return amp * env * w / (2 * len(freqs))


def main(seconds, out):
    seconds = float(seconds)
    n = int(seconds * SR)
    mix = np.zeros(n + SR * 6)
    # D, A, Bm, G  (root midi numbers around D3)
    chords = [(50, [62, 66, 69]), (45, [61, 64, 69]), (47, [62, 66, 71]), (43, [62, 67, 71])]
    bar = 4 * BEAT
    t, k = 0.0, 0
    while t < seconds + 2:
        root, tri = chords[k % 4]
        span = 2 * bar
        i0 = int(t * SR)
        p = pad([midi(x) for x in tri], span + 0.8, 0.22)
        mix[i0:i0 + len(p)] += p
        b = pad([midi(root), midi(root + 12) * 0.5], span, 0.16)
        mix[i0:i0 + len(b)] += b
        arp = [tri[0] + 12, tri[1] + 12, tri[2] + 12, tri[1] + 12, tri[0] + 24, tri[2] + 12, tri[1] + 12, tri[2] + 12]
        for j in range(16):  # eighth notes over two bars
            note = arp[j % 8]
            amp = 0.10 if j % 2 == 0 else 0.07
            s = pluck(midi(note), 0.9, amp)
            a = i0 + int(j * BEAT / 2 * SR)
            mix[a:a + len(s)] += s
        # shaker on the off-beats from the second chord onwards
        if k >= 1:
            for j in range(16):
                if j % 2 == 1:
                    L = int(0.07 * SR)
                    nz = rng.standard_normal(L) * np.exp(-np.arange(L) / SR * 60) * 0.018
                    a = i0 + int(j * BEAT / 2 * SR)
                    mix[a:a + L] += nz
        t += span
        k += 1
    mix = mix[:n]
    b, a = butter(2, 5200 / (SR / 2), 'low')
    mix = lfilter(b, a, mix)
    # simple stereo-ish width via short delay, then fades
    fade_in, fade_out = int(2.0 * SR), int(3.5 * SR)
    mix[:fade_in] *= np.linspace(0, 1, fade_in)
    mix[-fade_out:] *= np.linspace(1, 0, fade_out)
    mix /= np.abs(mix).max() + 1e-9
    left = mix
    right = np.concatenate([np.zeros(int(0.012 * SR)), mix[:-int(0.012 * SR)]])
    st = np.stack([left, right], 1) * 0.8
    wavfile.write(out, SR, (st * 32767).astype(np.int16))


if __name__ == '__main__':
    main(*sys.argv[1:])
