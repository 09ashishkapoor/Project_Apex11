"""Assemble the captured offering frames into a loopable GIF.

PIL writes the GIF, so no ffmpeg build is required. The palette is quantised to
the brand ramp and the frames are downscaled, which keeps the file small enough
to drop into a README.
"""
import pathlib

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
APP = HERE.parent
FRAMES = APP / ".shots" / "frames"
OUT = APP / "docs" / "offering.gif"
WIDTH = 280
FRAME_MS = 90  # matches the capture step, so the GIF plays at real speed


def main() -> None:
    files = sorted(FRAMES.glob("f-*.png"))
    if not files:
        raise SystemExit(f"no frames in {FRAMES}; run tools/capture-offer-frames.mjs first")

    images = []
    for path in files:
        image = Image.open(path).convert("RGB")
        height = round(image.height * WIDTH / image.width)
        images.append(image.resize((WIDTH, height), Image.LANCZOS))

    # One shared palette keeps the colours stable between frames (no flicker).
    contact = Image.new("RGB", (WIDTH, images[0].height * len(images)))
    for index, image in enumerate(images):
        contact.paste(image, (0, index * image.height))
    palette = contact.quantize(colors=96, method=Image.MEDIANCUT)

    quantised = [image.quantize(palette=palette, dither=Image.FLOYDSTEINBERG) for image in images]
    quantised[0].save(
        OUT,
        "GIF",
        save_all=True,
        append_images=quantised[1:],
        duration=FRAME_MS,
        loop=0,
        optimize=True,
    )
    size = OUT.stat().st_size / 1024
    print(f"{OUT}  {len(images)} frames  {images[0].width}x{images[0].height}  {size:.0f} KB")


if __name__ == "__main__":
    main()
