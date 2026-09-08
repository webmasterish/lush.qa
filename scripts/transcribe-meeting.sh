#!/usr/bin/env bash
# DotAim — local meeting transcription.
#
# Turns a call recording into a timestamped transcript + subtitles, entirely on
# this machine. Nothing is uploaded: client recordings stay local, which is the
# whole point of not using a hosted transcription service.
#
# Outputs, written next to the input file:
#   <name>.transcript.txt   timestamped plain text, for reading and grepping
#   <name>.transcript.srt   subtitles, for scrubbing the video in VLC
#
# Notes from the first run (2026-09-07 training call, 82 min):
#   - Language MUST be forced. Left to auto-detect, Whisper called accented
#     Gulf/Levantine English "Hebrew" at 0.34 confidence and returned phonetic
#     nonsense for the whole file.
#   - Substance transcribes well; proper nouns do not ("Lush" -> "Lash",
#     "Villaggio" -> "Village", "Falconeri" -> "Falco and Eddie"). VOCAB below
#     is fed to the model as an initial prompt to bias it toward the names we
#     actually use. Extend it as new brands, staff and places come up — that is
#     cheaper and more effective than moving to a bigger model.
#   - There is no speaker diarization. Whisper does not do it.
#
# First run downloads the model (~484 MB for small) and builds the venv; both
# are cached in $HOME, so every later run is offline and immediate.
#
# Usage: ./transcribe-meeting.sh <video-or-audio> [--model small|medium|large-v3]
set -euo pipefail

VENV="$HOME/.local/share/whisper-venv"
MODEL="small"
LANG="en"

# Proper nouns the model would otherwise mangle. Plain prose, not a word list:
# Whisper treats this as preceding context, so it biases better as a sentence.
VOCAB="A Shopify training call for Lush Qatar, part of Al Mana Fashion Group in Doha, \
run by Bassam Mardini of DotAim with Dee, Mario, Ann, Nirmal, Sibin and the store \
managers, covering the Villaggio branch, prices in QAR, cash on delivery, SKUs, \
fulfilment, the Be Yours theme, and the Falconeri brand."

die() { echo "error: $*" >&2; exit 1; }

[[ $# -ge 1 ]] || die "usage: $(basename "$0") <video-or-audio> [--model NAME]"
INPUT="$1"; shift
[[ -f "$INPUT" ]] || die "no such file: $INPUT"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --model) MODEL="${2:?--model needs a value}"; shift 2 ;;
    --lang)  LANG="${2:?--lang needs a value}"; shift 2 ;;
    *) die "unknown argument: $1" ;;
  esac
done

command -v ffmpeg >/dev/null || die "ffmpeg is not installed"

# The venv is self-contained and disposable: delete it and this rebuilds it.
# ensurepip is absent on this Ubuntu's python3, hence the get-pip bootstrap.
if [[ ! -x "$VENV/bin/python" ]]; then
  echo "==> building transcription venv at $VENV (one time)"
  python3 -m venv --without-pip "$VENV"
  curl -sSf --max-time 120 -o "$VENV/get-pip.py" https://bootstrap.pypa.io/get-pip.py
  "$VENV/bin/python" "$VENV/get-pip.py" -q
  "$VENV/bin/pip" install -q faster-whisper
fi

OUT="${INPUT%.*}.transcript"
WAV="$(mktemp -t transcribe-XXXXXX.wav)"
trap 'rm -f "$WAV"' EXIT

echo "==> extracting audio"
ffmpeg -nostdin -v error -y -i "$INPUT" -vn -ac 1 -ar 16000 -c:a pcm_s16le "$WAV"

echo "==> transcribing with $MODEL (lang=$LANG) — expect roughly a third of the recording's length"
MODEL="$MODEL" LANG="$LANG" VOCAB="$VOCAB" OUT="$OUT" WAV="$WAV" \
"$VENV/bin/python" - <<'PY'
import os, time
from faster_whisper import WhisperModel

model, lang, vocab = os.environ["MODEL"], os.environ["LANG"], os.environ["VOCAB"]
out, wav = os.environ["OUT"], os.environ["WAV"]

m = WhisperModel(model, device="cpu", compute_type="int8", cpu_threads=os.cpu_count())
segments, info = m.transcribe(wav, language=lang, initial_prompt=vocab,
                              vad_filter=True, beam_size=5)

def hms(t):
    h, rem = divmod(t, 3600)
    mnt, sec = divmod(rem, 60)
    return int(h), int(mnt), sec

start = time.time()
with open(out + ".txt", "w") as ft, open(out + ".srt", "w") as fs:
    for i, s in enumerate(segments, 1):
        h, mnt, sec = hms(s.start)
        eh, em, esec = hms(s.end)
        text = s.text.strip()
        ft.write(f"[{h:02d}:{mnt:02d}:{sec:05.2f}] {text}\n")
        fs.write(f"{i}\n{h:02d}:{mnt:02d}:{sec:06.3f} --> {eh:02d}:{em:02d}:{esec:06.3f}\n"
                 .replace(".", ",", 2))
        fs.write(f"{text}\n\n")
        # Flush per segment so a long run can be tailed while it works.
        ft.flush(); fs.flush()
        if i % 100 == 0:
            pct = s.end / info.duration * 100
            print(f"    {h:02d}:{mnt:02d} ({pct:.0f}%) — {time.time()-start:.0f}s elapsed", flush=True)
print(f"==> done: {info.duration/60:.0f} min of audio in {(time.time()-start)/60:.0f} min")
PY

echo "==> wrote $OUT.txt and $OUT.srt"
