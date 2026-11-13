"""Build a scene's audio from several speakers (narrator, a child, Zilo) and a mouth track for lip-sync.

Each line is one sentence of the scene's narration text, so captions and timing stay in step.
Child voices are Kokoro voices raised in pitch with formants shifted (rubberband), which shortens
the vocal tract the way a child's is shorter, rather than just speeding the voice up.

usage: python3 -I tools/dialogue.py lines.json out_dir
lines.json: {"id": "s05v_voice", "gap": 0.32, "lines": [{"who": "narrator", "text": "..."}, ...]}
"""
import json, os, subprocess, sys, tempfile
import numpy as np
from scipy.io import wavfile

sys.path.insert(0, os.path.dirname(__file__))
from tts import TTS, g2p, SR  # noqa: E402

VOICES = {
    "narrator": dict(voice="af_heart:0.75,af_bella:0.25", speed=1.0, pitch=1.0),
    "aoife": dict(voice="bf_lily:0.7,af_sky:0.3", speed=0.98, pitch=1.32),
    "zilo": dict(voice="af_heart:0.55,af_sky:0.45", speed=0.98, pitch=1.22),
}


def pitch(a, k):
    if abs(k - 1) < 1e-3:
        return a
    with tempfile.TemporaryDirectory() as d:
        i, o = f"{d}/i.wav", f"{d}/o.wav"
        wavfile.write(i, SR, (np.clip(a, -1, 1) * 32767).astype(np.int16))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", i, "-af", f"rubberband=pitch={k}:formant=shifted:pitchq=quality", "-ar", str(SR), o], check=True)
        return wavfile.read(o)[1].astype(np.float32) / 32768


def trim(a, thr=0.01):
    idx = np.where(np.abs(a) > thr)[0]
    return a[max(0, idx[0] - 240): idx[-1] + 1200] if len(idx) else a


def envelope(a, fps=30):
    hop = SR // fps
    e = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2)) for i in range(0, len(a), hop)])
    return e


def main(spec, out_dir):
    spec = json.load(open(spec)); os.makedirs(out_dir, exist_ok=True)
    gap = spec.get("gap", 0.32); engines = {}
    audio, starts, mouth, t = [], [], {}, 0.0
    for ln in spec["lines"]:
        cfg = VOICES[ln["who"]]
        if cfg["voice"] not in engines:
            engines[cfg["voice"]] = TTS(cfg["voice"])
        a = engines[cfg["voice"]].say(g2p(ln["text"])[0], cfg["speed"])
        a = trim(pitch(a, cfg["pitch"]))
        a = a / max(1e-6, np.abs(a).max()) * 0.89
        starts.append(round(t, 3))
        if ln["who"] != "narrator":  # mouth / speaking-bar track at 30 fps, 0..1
            e = envelope(a); e = np.clip(e / (np.percentile(e, 95) + 1e-6), 0, 1)
            mouth.setdefault(ln["who"], []).append({"t": round(t, 3), "env": [round(float(x), 3) for x in e]})
        audio += [a, np.zeros(int(SR * gap), np.float32)]
        t += len(a) / SR + gap
    audio = np.concatenate(audio[:-1])
    wavfile.write(f"{out_dir}/{spec['id']}.wav", SR, (audio * 32767).astype(np.int16))
    json.dump(mouth, open(f"{out_dir}/{spec['id']}_mouth.json", "w"))
    meta = {"id": spec["id"], "seconds": round(len(audio) / SR, 3), "sentences": starts}
    print(json.dumps(meta))
    return meta


if __name__ == "__main__":
    main(*sys.argv[1:])
