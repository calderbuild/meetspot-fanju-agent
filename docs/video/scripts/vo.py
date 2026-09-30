"""Record the voiceover from SCRIPT.md with ElevenLabs and write per-scene timing.

usage: python3 scripts/vo.py [--tempo 1.08] [--redo s1,s2]
Outputs audio/vo/<scene>.mp3 (tempo-adjusted), audio/vo/<scene>.align.json, and
audio/timing.json with each scene's duration and sentence-level caption cues.
eleven_v4 ignores voice_settings.speed, so speed-up is done with ffmpeg atempo.
"""

import argparse, base64, json, os, re, subprocess, sys, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOICE = "bIHbv24MWmeRgasZH58o"  # Will
MODEL = "eleven_v4"


def api_key():
    for line in open(os.path.expanduser("~/.config/api-keys.env")):
        m = re.match(
            r'\s*(?:export\s+)?ELEVENLABS_API_KEY\s*=\s*["\']?([^"\'\s]+)', line
        )
        if m:
            return m.group(1)
    sys.exit("ELEVENLABS_API_KEY missing from ~/.config/api-keys.env")


def tts(text):
    r = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps({"text": text, "model_id": MODEL}).encode(),
        headers={"xi-api-key": api_key(), "Content-Type": "application/json"},
    )
    try:
        return json.loads(urllib.request.urlopen(r).read())
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs HTTP {e.code}: {e.read()[:300]!r}")


def scenes():
    out, cur = {}, None
    for line in (ROOT / "SCRIPT.md").read_text().splitlines():
        m = re.match(r"## (s\d+)", line)
        if m:
            cur = m.group(1)
        elif cur and line.strip():
            out[cur] = (out.get(cur, "") + line.strip()).strip()
    return out


def cues(text, align, tempo):
    """Split into caption cues at sentence ends and at commas once a cue passes ~16 chars."""
    chars, starts, ends = (
        align["characters"],
        align["character_start_times_seconds"],
        align["character_end_times_seconds"],
    )
    assert "".join(chars) == text, "alignment text drifted from the script"
    res, buf, t0 = [], "", None
    for c, s, e in zip(chars, starts, ends):
        if t0 is None and c.strip():
            t0 = s
        buf += c
        hard = c in "。！？"
        soft = c in "，、：" and len(buf.strip()) >= 16
        if hard or soft:
            res.append(
                {
                    "text": buf.strip().rstrip("。，、："),
                    "start": round(t0 / tempo, 3),
                    "end": round(e / tempo, 3),
                }
            )
            buf, t0 = "", None
    if buf.strip():
        res.append(
            {
                "text": buf.strip(),
                "start": round(t0 / tempo, 3),
                "end": round(ends[-1] / tempo, 3),
            }
        )
    return res


def duration(path):
    return float(
        subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "csv=p=0",
                str(path),
            ]
        )
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tempo", type=float, default=1.0)
    ap.add_argument("--redo", default="")
    a = ap.parse_args()
    vo = ROOT / "audio" / "vo"
    vo.mkdir(parents=True, exist_ok=True)
    redo = set(filter(None, a.redo.split(",")))
    for sid, text in scenes().items():
        if sid not in redo and (vo / f"{sid}.raw.mp3").exists():
            continue  # never re-bill a take that is already on disk
        d = tts(text)
        (vo / f"{sid}.raw.mp3").write_bytes(base64.b64decode(d["audio_base64"]))
        (vo / f"{sid}.align.json").write_text(
            json.dumps(d["alignment"], ensure_ascii=False)
        )
        print("recorded", sid, len(text), "chars")
    timing = {}
    for sid, text in scenes().items():
        raw, out = vo / f"{sid}.raw.mp3", vo / f"{sid}.mp3"
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-v",
                "error",
                "-i",
                str(raw),
                "-filter:a",
                f"atempo={a.tempo}",
                "-ar",
                "44100",
                str(out),
            ],
            check=True,
        )
        align = json.loads((vo / f"{sid}.align.json").read_text())
        timing[sid] = {
            "text": text,
            "duration": round(duration(out), 3),
            "cues": cues(text, align, a.tempo),
        }
    (ROOT / "audio" / "timing.json").write_text(
        json.dumps(timing, ensure_ascii=False, indent=1)
    )
    print("total VO", round(sum(t["duration"] for t in timing.values()), 2), "s")


if __name__ == "__main__":
    main()
