"""Compose the five implemented screens into one contact sheet for review."""
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.normpath(os.path.join(HERE, ".."))
SHOTS = os.path.join(APP, ".shots")
OUT = os.path.join(APP, ".shots", "contact-sheet.png")

SCREENS = [
    ("00-splash.png", "Opening"),
    ("01-today.png", "Today"),
    ("02-altar.png", "Altar"),
    ("05-session-counted.png", "Session"),
    ("07-blessing.png", "Blessing"),
    ("09-ledger.png", "Ledger"),
]

SCALE = 0.54
GAP = 22
BACKGROUND = (13, 8, 6)
LABEL_H = 34


def main() -> None:
    tiles = []
    for name, _label in SCREENS:
        path = os.path.join(SHOTS, name)
        if not os.path.exists(path):
            raise SystemExit(f"missing screenshot: {path}")
        image = Image.open(path).convert("RGB")
        width = int(image.width * SCALE)
        height = int(image.height * SCALE)
        tiles.append(image.resize((width, height), Image.LANCZOS))

    tile_w = tiles[0].width
    tile_h = tiles[0].height
    sheet_w = len(tiles) * tile_w + (len(tiles) + 1) * GAP
    sheet_h = tile_h + 2 * GAP + LABEL_H
    sheet = Image.new("RGB", (sheet_w, sheet_h), BACKGROUND)

    from PIL import ImageDraw

    draw = ImageDraw.Draw(sheet)
    x = GAP
    for tile, (_name, label) in zip(tiles, SCREENS):
        sheet.paste(tile, (x, GAP + LABEL_H))
        draw.text((x + 4, GAP + 8), label.upper(), fill=(214, 196, 170))
        x += tile_w + GAP

    sheet.save(OUT, "PNG", optimize=True)
    print(f"{OUT}  {sheet.size[0]}x{sheet.size[1]}  {os.path.getsize(OUT) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
