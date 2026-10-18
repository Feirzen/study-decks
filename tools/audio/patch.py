"""Attach audio paths to lessons + overview list in the set file, keeping one-item-per-line format."""
import json, re
P = "/home/claude/study-decks/sets/exsc-362/midterm.json"
meta = json.load(open("/home/claude/tts/meta.json"))
src = open(P, encoding="utf-8").read()
lines = src.split("\n")
out = []
for ln in lines:
    m = re.match(r'^(\s*)(\{"id": "(L-[a-z]-\d)".*\}),?$', ln)
    if m and m.group(3) in meta:
        obj = json.loads(m.group(2))
        obj["audio"] = f"audio/exsc-362/{obj['id']}.mp3"; obj["audioSecs"] = meta[obj["id"]]["secs"]
        comma = "," if ln.rstrip().endswith(",") else ""
        ln = m.group(1) + json.dumps(obj, ensure_ascii=False) + comma
    out.append(ln)
txt = "\n".join(out)
ov = [{"id": k, "title": v["title"], "file": f"audio/exsc-362/{k}.mp3", "secs": v["secs"]} for k, v in meta.items() if k.startswith("ov-")]
txt = re.sub(r'\n  "audio": \[.*?\],', "", txt, flags=re.S)
txt = txt.replace('\n  "readiness": [', '\n  "audio": ' + json.dumps(ov, ensure_ascii=False) + ',\n  "readiness": [', 1)
d = json.loads(txt)
n = sum(1 for c in d["categories"] for l in c["lessons"] if "audio" in l)
open(P, "w", encoding="utf-8").write(txt)
print("lessons with audio:", n, "overviews:", len(d.get("audio", [])))
