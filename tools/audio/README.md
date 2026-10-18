# Lesson narration (Kokoro TTS)

Free, local text-to-speech for lesson pages. No API keys, no credits.

1. `pip install --break-system-packages kokoro-onnx soundfile`
2. Download the model files next to these scripts:
   - https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx (save as `kokoro.onnx`)
   - https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin (save as `voices.bin`)
3. Edit the `SET` path and the overview tracks in `scripts.py` for the new deck, and the `OUT` folder in `gen.py`
   (and the audio path prefix in `patch.py`). Run `python3 scripts.py > transcripts.txt` and read it over:
   formulas and units get turned into spoken words there.
4. `python3 gen.py` (voice `af_heart`, about real time on 2 CPU cores; resumable, skips finished tracks).
5. `python3 patch.py` adds `audio` + `audioSecs` to each lesson and the `audio` overview list to the set file.

`audio.js` in the site root plays them: a player at the top of each lesson, a "Listen" list on the deck home,
and a mini bar that keeps playing while you move around.
