"""More natural narration: Kokoro af_heart reading each scene as one passage.

Reading whole passages (instead of sentence by sentence) keeps the natural
rise and fall across sentences. Sentence start times for the animation are
recovered from the pauses Kokoro leaves at full stops.

usage: python3 -I tools/tts_v2.py video/narration.json out/vo_v2 [speed]
"""
import json, os, re, sys
import numpy as np
from scipy.io import wavfile

sys.path.insert(0, os.path.dirname(__file__))
from tts import TTS, g2p, SR  # noqa: E402


def silences(a, min_len=0.12, thr=0.012):
    fr = int(0.01 * SR); e = np.array([np.sqrt(np.mean(a[i:i + fr] ** 2)) for i in range(0, len(a) - fr, fr)])
    out, i = [], 0
    while i < len(e):
        if e[i] < thr:
            j = i
            while j < len(e) and e[j] < thr: j += 1
            if (j - i) * 0.01 >= min_len: out.append((i * 0.01, j * 0.01))
            i = j
        else:
            i += 1
    return out


def main(script, out_dir, speed=0.95):
    speed = float(speed); os.makedirs(out_dir, exist_ok=True)
    tts = TTS(os.environ.get("VOICE", "af_heart")); meta = []
    for sc in json.load(open(script)):
        sents = re.split(r"(?<=[.!?])\s+", sc["text"].strip())
        # chunks of whole sentences that fit the model's 510-token window
        chunks, cur = [], []
        for s in sents:
            if cur and len(g2p(" ".join(cur + [s]))[0]) > 420:
                chunks.append(cur); cur = []
            cur.append(s)
        chunks.append(cur)
        audio, starts = [], []
        t = 0.0
        for ch in chunks:
            a = tts.say(g2p(" ".join(ch))[0], speed)
            # locate each sentence boundary inside this chunk at the pause nearest its expected position
            sil = silences(a); L = len(a) / SR
            lens = np.array([len(x) for x in ch], float); cum = np.cumsum(lens) / lens.sum()
            starts.append(round(t, 3))
            for k in range(len(ch) - 1):
                exp = cum[k] * L
                cands = [s for s in sil if abs((s[0] + s[1]) / 2 - exp) < 1.6]
                best = max(cands, key=lambda s: (s[1] - s[0]) - 0.15 * abs((s[0] + s[1]) / 2 - exp)) if cands else (exp, exp)
                starts.append(round(t + best[1] - 0.05, 3))
            audio += [a, np.zeros(int(SR * 0.42), np.float32)]
            t += len(a) / SR + 0.42
        audio = np.concatenate(audio[:-1]); audio = audio / max(1e-6, np.abs(audio).max()) * 0.89
        wavfile.write(f"{out_dir}/{sc['id']}.wav", SR, (audio * 32767).astype(np.int16))
        meta.append({"id": sc["id"], "seconds": round(len(audio) / SR, 3), "sentences": starts})
        print(sc["id"], meta[-1]["seconds"], len(chunks), starts, flush=True)
    json.dump(meta, open(f"{out_dir}/durations.json", "w"), indent=1)
    print("total", round(sum(m["seconds"] for m in meta), 1))


if __name__ == "__main__":
    main(*sys.argv[1:])
