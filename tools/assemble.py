"""Join rendered scenes, lay the narration under them and write WebVTT captions.

usage: python3 -I tools/assemble.py
"""
import json, re, subprocess, os
import numpy as np
from scipy.io import wavfile

FPS, LEAD, TAIL, LAST_TAIL, SR = 30, 0.45, 0.85, 2.4, 24000
dur = json.load(open("out/vo/durations.json"))
script = {s["id"]: s["text"] for s in json.load(open("video/narration.json"))}

def ts(t):
    h, m = int(t // 3600), int(t % 3600 // 60)
    return f"{h:02d}:{m:02d}:{t % 60:06.3f}"

track, cues, t0 = [], [], 0.0
for i, d in enumerate(dur):
    total = LEAD + d["seconds"] + (LAST_TAIL if i == len(dur) - 1 else TAIL)
    total = round(total * FPS) / FPS                       # match the rendered frame count
    sr, a = wavfile.read(f"out/vo/{d['id']}.wav")
    a = a.astype(np.float32) / 32768
    seg = np.zeros(int(round(total * SR)), np.float32)
    s0 = int(LEAD * SR); seg[s0:s0 + len(a)] = a[: len(seg) - s0]
    track.append(seg)
    sents = re.split(r"(?<=[.!?])\s+", script[d["id"]].strip())
    starts = d["sentences"] + [d["seconds"]]
    for j, text in enumerate(sents):
        a0, a1 = t0 + LEAD + starts[j], t0 + LEAD + starts[j + 1] - 0.05
        cues.append((a0, a1, text))
    t0 += total

audio = np.concatenate(track)
wavfile.write("out/narration.wav", SR, (np.clip(audio, -1, 1) * 32767).astype(np.int16))
with open("site/assets/granthai-demo.vtt", "w") as f:
    f.write("WEBVTT\n\n")
    for k, (a0, a1, text) in enumerate(cues, 1):
        f.write(f"{k}\n{ts(a0)} --> {ts(a1)}\n{text}\n\n")

with open("out/scenes/list.txt", "w") as f:
    for d in dur:
        f.write(f"file '{os.path.abspath('out/scenes/' + d['id'] + '.mp4')}'\n")
run = lambda *a: subprocess.run(a, check=True)
run("ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "out/scenes/list.txt", "-c", "copy", "out/video_silent.mp4")
run("ffmpeg", "-y", "-loglevel", "error", "-i", "out/video_silent.mp4", "-i", "out/narration.wav",
    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-shortest", "out/granthai-demo.mp4")
print("video seconds:", round(t0, 2), "cues:", len(cues))
