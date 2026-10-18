import json, os, subprocess, time, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
import scripts
OUT = "/home/claude/study-decks/audio/exsc-362"; os.makedirs(OUT, exist_ok=True)
k = Kokoro("kokoro.onnx", "voices.bin")
_, T = scripts.tracks()
T = T + scripts.OVERVIEW
meta = {}
if os.path.exists("meta.json"): meta = json.load(open("meta.json"))
SR = 24000
def sil(sec): return np.zeros(int(SR * sec), dtype=np.float32)
for t in T:
    mp3 = f"{OUT}/{t['id']}.mp3"
    if t["id"] in meta and os.path.exists(mp3): continue
    t0 = time.time(); chunks = [sil(0.4)]
    for i, part in enumerate(t["parts"]):
        if part == "[PAUSE]": chunks.append(sil(3.0)); continue
        a, sr = k.create(part, voice="af_heart", speed=1.0, lang="en-us")
        chunks.append(a.astype(np.float32)); chunks.append(sil(0.9 if i == 0 else 0.45))
    audio = np.concatenate(chunks + [sil(0.6)])
    sf.write("tmp.wav", audio, SR)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", "tmp.wav", "-ac", "1", "-b:a", "64k", mp3], check=True)
    meta[t["id"]] = {"title": t["title"], "secs": round(len(audio) / SR)}
    json.dump(meta, open("meta.json", "w"), indent=1)
    print(t["id"], meta[t["id"]]["secs"], "s audio in", round(time.time() - t0), "s", flush=True)
print("DONE", flush=True)
