"""Offline narration for the GranthAI demo video.

Kokoro-82M (Apache-2.0, ONNX) with the misaki US lexicons as the grapheme-to-
phoneme step, so no espeak is needed. Words missing from the lexicon go in
OVERRIDES below.

usage: python3 -I tools/tts.py video/narration.json out/vo
"""
import json, re, sys, os
import numpy as np
import onnxruntime as rt
from scipy.io import wavfile

DL = "/home/claude/dl"
MODEL = f"{DL}/kokoro-v1.0.onnx"
VOICES = f"{DL}/voices-v1.0.bin"
VOCAB = json.load(open(f"{DL}/kokoro-onnx/src/kokoro_onnx/config.json"))["vocab"]
LEX = {}
for name in ("us_silver.json", "us_gold.json"):      # gold wins
    LEX.update(json.load(open(f"{DL}/misaki/misaki/data/{name}")))
SR = 24000

OVERRIDES = {
    "granthai": "ɡɹˈʌnθ ˌAˈI", "indra": "ˈɪndɹə", "ucd": "jˌu sˌi dˈi", "maths": "mˈæθs", "granth": "ɡɹˈʌnθ", "aoife": "ˈifə", "deis": "dˈɛʃ",
    "cao": "sˌi ˌA ˈO", "gdpr": "ʤˌi dˌi pˌi ˈɑɹ", "eu": "ˌi ˈju", "ai": "ˌA ˈI",
    "cert": "sˈɜɹt", "a": "ɐ", "sanskrit": "sˈænskɹɪt", "bayesian": "bˈAziən",
    "what's": "wˈʌts", "it's": "ɪts", "that's": "ðˈæts", "here's": "hˈɪɹz",
    "she'll": "ʃil", "can't": "kˈænt", "uk": "jˌu kˈA", "irish": "ˈIɹɪʃ",
    "chatbot": "ʧˈætbɑt", "chatbots": "ʧˈætbɑts", "ireland's": "ˈIɹlən dz".replace(" ", ""),
    "pupils": "pjˈupᵊlz", "mini": "mˈɪni", "hear": "hˈɪɹ", "mentor": "mˈɛntɔɹ",
    "ten-minute": "tˈɛn mˈɪnɪt", "activities": "æktˈɪvɪTiz", "copies": "kˈɑpiz",
    "ins": "ɪnz", "motivated": "mˈOTəvˌATᵻd", "tries": "tɹˈIz", "sixths": "sˈɪksθs", "quarters": "kwˈɔɹTəɹz",
}


def lookup(word):
    w = word.lower()
    if w in OVERRIDES:
        return OVERRIDES[w]
    for key in (word, w, w.capitalize()):
        if key in LEX:
            v = LEX[key]
            return v.get("DEFAULT") or next(iter(v.values())) if isinstance(v, dict) else v
    # simple morphology for plurals, past tense, -ing
    for suf, add in (("'s", "z"), ("es", "ɪz"), ("s", "z"), ("ed", "d"), ("ing", "ɪŋ"), ("ly", "li")):
        if w.endswith(suf) and len(w) > len(suf) + 2:
            base = lookup(w[: -len(suf)])
            if base:
                if suf in ("s", "'s") and base[-1] in "ptkfθ":
                    add = "s"
                return base + add
    return None


def g2p(text):
    tokens = re.findall(r"[A-Za-z][A-Za-z'\-]*|[.,!?;:—]", text)
    out, missing = [], []
    for i, t in enumerate(tokens):
        if re.match(r"[.,!?;:—]", t):
            out.append({"—": ",", ";": ",", ":": ","}.get(t, t))
            continue
        nxt = tokens[i + 1] if i + 1 < len(tokens) else ""
        if t.lower() == "the":
            out.append(" ði" if nxt[:1].lower() in "aeiou" else " ðə"); continue
        if t.lower() == "to":
            out.append(" tu" if nxt[:1].lower() in "aeiou" else " tə"); continue
        parts = [p for p in t.split("-") if p] if "-" in t and t.lower() not in OVERRIDES else [t]
        for p in parts:
            ph = lookup(p)
            if ph is None:
                missing.append(p); ph = p.lower()
            out.append(" " + ph)
    s = "".join(out).strip()
    s = re.sub(r"\s+([.,!?])", r"\1", s)
    return s, missing


class TTS:
    def __init__(self, voice="af_heart"):
        self.sess = rt.InferenceSession(MODEL, providers=["CPUExecutionProvider"])
        self.voice = np.load(VOICES)[voice]

    def say(self, phonemes, speed=1.0):
        ids = [VOCAB[c] for c in phonemes if c in VOCAB]
        style = self.voice[min(len(ids), len(self.voice)) - 1]
        audio = self.sess.run(None, {"tokens": np.array([[0, *ids, 0]], dtype=np.int64),
                                     "style": style.astype(np.float32),
                                     "speed": np.array([speed], dtype=np.float32)})[0].ravel()
        # trim leading/trailing near-silence
        idx = np.where(np.abs(audio) > 0.01)[0]
        return audio[max(idx[0] - 600, 0): idx[-1] + 1200] if len(idx) else audio


def main(script_path, out_dir, voice="af_heart"):
    os.makedirs(out_dir, exist_ok=True)
    scenes = json.load(open(script_path))
    tts = TTS(voice)
    meta, all_missing = [], set()
    for sc in scenes:
        sentences = re.split(r"(?<=[.!?])\s+", sc["text"].strip())
        chunks, starts, t = [], [], 0.0
        for s in sentences:
            starts.append(round(t, 3))
            ph, miss = g2p(s); all_missing.update(miss)
            a = tts.say(ph, sc.get("speed", 1.0))
            chunks += [a, np.zeros(int(SR * 0.32), np.float32)]
            t += (len(a) + int(SR * 0.32)) / SR
        audio = np.concatenate(chunks[:-1])
        audio = audio / max(1e-6, np.abs(audio).max()) * 0.89
        path = os.path.join(out_dir, f"{sc['id']}.wav")
        wavfile.write(path, SR, (audio * 32767).astype(np.int16))
        meta.append({"id": sc["id"], "seconds": round(len(audio) / SR, 3), "sentences": starts})
        print(sc["id"], meta[-1]["seconds"])
    json.dump(meta, open(os.path.join(out_dir, "durations.json"), "w"), indent=1)
    print("missing words:", sorted(all_missing))
    print("total speech:", round(sum(m["seconds"] for m in meta), 1))


if __name__ == "__main__":
    main(*sys.argv[1:])
