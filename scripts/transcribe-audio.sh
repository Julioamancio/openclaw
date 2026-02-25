#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <arquivo-audio> [language]"
  exit 1
fi

AUDIO_FILE="$1"
LANG="${2:-pt}"

if [[ ! -f "$AUDIO_FILE" ]]; then
  echo "Arquivo não encontrado: $AUDIO_FILE"
  exit 1
fi

VENV="/opt/stt-venv"
if [[ ! -x "$VENV/bin/python" ]]; then
  echo "Venv não encontrado em $VENV"
  exit 1
fi

"$VENV/bin/python" - <<'PY' "$AUDIO_FILE" "$LANG"
import sys
from faster_whisper import WhisperModel

audio_path = sys.argv[1]
lang = sys.argv[2]

model = WhisperModel("small", device="cpu", compute_type="int8")
segments, info = model.transcribe(audio_path, language=lang, vad_filter=True)

print(f"[lang_detected={info.language} prob={info.language_probability:.2f} duration={info.duration:.1f}s]")
for seg in segments:
    txt = seg.text.strip()
    if txt:
        print(txt)
PY
