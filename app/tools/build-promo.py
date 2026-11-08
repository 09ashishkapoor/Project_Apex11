"""Encode the promo clips from the raw Playwright captures.

Playwright records video only, so the sound version is built by laying the app's
own chant loop against the measured moment the chant starts. That keeps it the
real audio rather than a substitute, and it stays in step without hand-tuning:
the offsets come from the recording run itself (see tools/record-promo.mjs).
"""
import json
import pathlib
import subprocess
import sys

APP = pathlib.Path(__file__).resolve().parent.parent
RAW = APP / ".shots" / "promo"
OUT = APP / ".." / "reel"
OUT.mkdir(exist_ok=True)

FFMPEG = "ffmpeg"
FFPROBE = "ffprobe"

SCALE = "scale=1080:1920:flags=lanczos,format=yuv420p"


def run(args: list[str]) -> None:
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr[-2000:], file=sys.stderr)
        raise SystemExit(f"ffmpeg failed: {' '.join(args[:6])}…")


def probe(path: pathlib.Path, entries: str) -> str:
    result = subprocess.run(
        [FFPROBE, "-v", "error", "-show_entries", entries, "-of", "default=noprint_wrappers=1", str(path)],
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def loop_clip() -> None:
    marks = json.loads((RAW / "loop.json").read_text())["marks"]
    start = marks["start"] / 1000
    length = 4.6

    target = OUT / "mantrini-loop.mp4"
    run(
        [
            FFMPEG, "-y", "-v", "error",
            "-ss", f"{start:.3f}", "-t", f"{length:.3f}",
            "-i", str(RAW / "loop.webm"),
            "-vf", SCALE,
            "-r", "30", "-c:v", "libx264", "-preset", "slow", "-crf", "20",
            "-movflags", "+faststart", "-an",
            str(target),
        ]
    )
    print(f"loop      {target.name}  {target.stat().st_size / 1024:.0f} KB  {length:.1f}s  silent")


def auto_clip_with_sound() -> None:
    meta = json.loads((RAW / "auto.json").read_text())["marks"]
    chant_start = meta["chantStart"] / 1000
    chant_len = (meta["chantEnd"] - meta["chantStart"]) / 1000
    source = APP / "public" / "audio" / "adya-mahakali.mp3"

    total = float(probe(RAW / "auto.webm", "format=duration").split("=")[1])
    fade_at = max(0.0, chant_len - 1.6)

    target = OUT / "mantrini-reel-audio.mp4"
    audio_filter = (
        f"[1:a]atrim=0:{chant_len:.3f},asetpts=N/SR/TB,"
        f"afade=t=out:st={fade_at:.3f}:d=1.6,"
        f"adelay={int(chant_start * 1000)}:all=1,"
        f"apad[a]"
    )
    run(
        [
            FFMPEG, "-y", "-v", "error",
            "-i", str(RAW / "auto.webm"),
            "-stream_loop", "-1", "-i", str(source),
            "-filter_complex", f"[0:v]{SCALE}[v];{audio_filter}",
            "-map", "[v]", "-map", "[a]",
            "-t", f"{total:.3f}",
            "-r", "30", "-c:v", "libx264", "-preset", "slow", "-crf", "20",
            "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
            "-movflags", "+faststart",
            str(target),
        ]
    )
    print(
        f"auto      {target.name}  {target.stat().st_size / 1024:.0f} KB  {total:.1f}s  "
        f"chant from {chant_start:.2f}s for {chant_len:.1f}s"
    )


def main() -> None:
    loop_clip()
    auto_clip_with_sound()
    for name in ("mantrini-loop.mp4", "mantrini-reel-audio.mp4"):
        path = OUT / name
        print(f"\n{name}")
        print("  " + probe(path, "stream=codec_name,width,height,r_frame_rate").replace("\n", "  "))
        print("  " + probe(path, "format=duration").replace("\n", "  "))


if __name__ == "__main__":
    main()
