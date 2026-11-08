"""Re-encode the four chant clips to one consistent, much smaller spec.

The originals shipped at wildly different settings — 65 kbps to 329 kbps, one
stereo among monos — which made the offline bundle heavy and the loudness jump
between deities. This normalises them to:

  mono, 44.1 kHz, 96 kbps MP3, loudness-matched to -16 LUFS

and leaves the duration alone, because the auto-count cadence is derived from
the clip length: shortening or padding a clip would silently change how fast a
mala completes.

Source of truth is the licensed originals under assets-src/audio/, never the
already re-encoded copies, so repeated runs cannot degrade the audio.
"""
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

APP = pathlib.Path(__file__).resolve().parent.parent
REPO = APP.parent
SOURCE = APP / "assets-src" / "audio"
TARGET = APP / "public" / "audio"

# original asset name -> web asset name
FILES = {
    "maha.mp3": "adya-mahakali.mp3",
    "batuk.mp3": "batuk-bhairav.mp3",
    "swarna.mp3": "swarnaakarshana-bhairav.mp3",
    "skanda.mp3": "skanda-bhairav.mp3",
}

TARGET_LUFS = -16.0
TRUE_PEAK = -1.5
BITRATE = "96k"
SAMPLE_RATE = 44100
DURATION_TOLERANCE_S = 0.06


def find_ffmpeg() -> tuple[str, str]:
    for name in ("ffmpeg", "ffprobe"):
        path = shutil.which(name)
        if path:
            continue
        raise SystemExit(f"{name} not found on PATH")
    return shutil.which("ffmpeg"), shutil.which("ffprobe")


def duration(path: pathlib.Path, ffprobe: str) -> float:
    out = subprocess.run(
        [
            ffprobe,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(out.stdout.strip())


def measure(path: pathlib.Path, ffmpeg: str) -> dict:
    """First loudnorm pass: what the file currently measures."""
    out = subprocess.run(
        [
            ffmpeg,
            "-hide_banner",
            "-nostats",
            "-i",
            str(path),
            "-af",
            f"loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK}:LRA=11:print_format=json",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
    )
    stderr = out.stderr
    start = stderr.rfind("{")
    end = stderr.rfind("}")
    if start == -1 or end == -1:
        raise SystemExit(f"loudnorm produced no measurement for {path.name}:\n{stderr[-800:]}")
    return json.loads(stderr[start : end + 1])


def encode(src: pathlib.Path, dst: pathlib.Path, ffmpeg: str) -> None:
    stats = measure(src, ffmpeg)
    second_pass = (
        f"loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK}:LRA=11"
        f":measured_I={stats['input_i']}"
        f":measured_TP={stats['input_tp']}"
        f":measured_LRA={stats['input_lra']}"
        f":measured_thresh={stats['input_thresh']}"
        f":offset={stats['target_offset']}"
        ":linear=true"
    )
    subprocess.run(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(src),
            "-af",
            second_pass,
            "-ac",
            "1",
            "-ar",
            str(SAMPLE_RATE),
            "-c:a",
            "libmp3lame",
            "-b:a",
            BITRATE,
            str(dst),
        ],
        check=True,
    )


def main() -> None:
    write = "--write" in sys.argv
    ffmpeg, ffprobe = find_ffmpeg()

    before_total = 0
    after_total = 0
    rows = []

    with tempfile.TemporaryDirectory() as tmp:
        staging = pathlib.Path(tmp)
        for original, web_name in FILES.items():
            src = SOURCE / original
            if not src.exists():
                raise SystemExit(f"missing source: {src}")
            src_duration = duration(src, ffprobe)
            dst = staging / web_name
            encode(src, dst, ffmpeg)
            out_duration = duration(dst, ffprobe)

            drift = abs(out_duration - src_duration)
            if drift > DURATION_TOLERANCE_S:
                raise SystemExit(
                    f"{web_name}: duration drifted {drift:.3f}s "
                    f"({src_duration:.3f} -> {out_duration:.3f}); the auto-count "
                    "cadence is derived from this, so aborting."
                )

            before = src.stat().st_size
            after = dst.stat().st_size
            before_total += before
            after_total += after
            rows.append((web_name, src_duration, before, after, drift))

        for web_name, dur, before, after, drift in rows:
            print(
                f"{web_name:34} {dur:5.2f}s  {before / 1024:7.1f} KB -> "
                f"{after / 1024:6.1f} KB  (drift {drift * 1000:.0f} ms)"
            )
        saved = (before_total - after_total) / 1024
        pct = 100 * (1 - after_total / before_total)
        print(f"\ntotal {before_total / 1024:.0f} KB -> {after_total / 1024:.0f} KB  "
              f"({saved:.0f} KB smaller, {pct:.0f}%)")

        if not write:
            print("\n(dry run — pass --write to replace public/audio/)")
            return

        TARGET.mkdir(parents=True, exist_ok=True)
        for original, web_name in FILES.items():
            shutil.copy2(staging / web_name, TARGET / web_name)
        print(f"\nwrote {len(FILES)} files to {TARGET}")

    # The measured durations feed the offline cadence fallback in deities.ts.
    print("\ndeity chantMs values for src/data/deities.ts:")
    for web_name, dur, _b, _a, _d in rows:
        print(f"  {web_name:34} chantMs: {round(dur * 1000)}")


if __name__ == "__main__":
    main()
