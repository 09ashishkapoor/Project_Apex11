"""Build the MANTRINI app mark: the gold trikoṇa on the temple maroon ground.

The installed icon should read as the same mark as the site, not as a cropped
photograph. At 48 dp a photograph turns to mush, so the deity is rendered inside
the triangle as a dark, maroon-toned presence and the gold edge carries the
identity.

Every icon the app needs is produced here:
  public/icons/*.png          PWA manifest, apple-touch, favicon
  android/.../mipmap-*/       legacy launcher + adaptive foreground
"""
import os
from PIL import Image, ImageDraw, ImageFilter

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.normpath(os.path.join(HERE, ".."))
DEITY = os.path.join(APP, "public", "img", "adya-mahakali.jpg")
PUBLIC_ICONS = os.path.join(APP, "public", "icons")
ANDROID_RES = os.path.join(APP, "android", "app", "src", "main", "res")

# Brand tokens, from jaikhyapaparampara.com/styles.css
VOID = (13, 5, 6)
SHADOW = (31, 11, 17)
TEMPLE = (45, 15, 24)
WINE = (74, 14, 23)
MAROON = (139, 38, 53)
GOLD = (232, 196, 104)
GOLD_PALE = (244, 228, 193)

SUPERSAMPLE = 4  # render large, downsample for clean edges


def radial_background(size: int) -> Image.Image:
    """Temple gradient: a maroon glow high and centre, sinking to the void."""
    y, x = np.mgrid[0:size, 0:size].astype(np.float32) / size
    # distance from a point just above centre
    dist = np.sqrt((x - 0.5) ** 2 + ((y - 0.34) * 1.18) ** 2) / 0.72
    dist = np.clip(dist, 0.0, 1.0)[..., None]

    inner = np.array(TEMPLE, dtype=np.float32)
    mid = np.array(SHADOW, dtype=np.float32)
    outer = np.array(VOID, dtype=np.float32)

    first = inner * (1 - np.clip(dist / 0.55, 0, 1)) + mid * np.clip(dist / 0.55, 0, 1)
    rgb = first * (1 - np.clip((dist - 0.55) / 0.45, 0, 1)) + outer * np.clip(
        (dist - 0.55) / 0.45, 0, 1
    )
    return Image.fromarray(rgb.astype(np.uint8), "RGB").convert("RGBA")


def triangle_geometry(size: int, width_ratio: float):
    """Apex-down trikoṇa, centred. Returns polygon points in pixels.

    A downward triangle reads as bottom-heavy if its bounding box is centred,
    so the box is raised slightly and the optical centre lands on the middle.
    """
    width = size * width_ratio
    height = width * 0.8660  # equilateral
    cx = size / 2
    top = size * 0.485 - height / 2
    return [
        (cx, top + height),
        (cx - width / 2, top),
        (cx + width / 2, top),
    ]


def deity_plate(size: int, points, tint: float = 0.55) -> Image.Image:
    """The photograph, clipped to the triangle, toned down toward maroon."""
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    left, top = int(min(xs)), int(min(ys))
    box_w, box_h = int(max(xs) - left), int(max(ys) - top)

    # The clip polygon must be in crop-local coordinates. Using canvas
    # coordinates here offsets the mask by (left, top) — which is what put the
    # deity in the wrong corner on the first attempt.
    local = [(x - left, y - top) for x, y in points]
    mask = Image.new("L", (box_w, box_h), 0)
    ImageDraw.Draw(mask).polygon(local, fill=255)

    source = Image.open(DEITY).convert("RGB")
    scale = max(box_w / source.width, box_h / source.height)
    resized = source.resize(
        (max(box_w, int(source.width * scale)), max(box_h, int(source.height * scale))),
        Image.LANCZOS,
    )
    # Bias the crop toward the top so the face sits in the upper third of the
    # triangle rather than being cut by the apex.
    offset_y = int((resized.height - box_h) * 0.12)
    offset_x = int((resized.width - box_w) / 2)
    crop = resized.crop((offset_x, offset_y, offset_x + box_w, offset_y + box_h))

    # Duotone toward the temple palette so the icon is a mark, not a photo.
    grey = crop.convert("L")
    maroon = Image.new("RGB", crop.size, MAROON)
    wine = Image.new("RGB", crop.size, WINE)
    duotone = Image.composite(maroon, wine, grey)
    plate = Image.blend(crop, duotone, tint)

    # Vignette so the edges fall into the ground.
    vignette = Image.new("L", (box_w, box_h), 0)
    ImageDraw.Draw(vignette).ellipse(
        (-box_w * 0.18, -box_h * 0.22, box_w * 1.18, box_h * 1.12), fill=255
    )
    vignette = vignette.filter(ImageFilter.GaussianBlur(max(1, box_w * 0.06)))
    plate = Image.composite(plate, Image.new("RGB", crop.size, VOID), vignette)

    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(plate, (left, top), mask)
    return out


def build(size: int, width_ratio: float = 0.60, with_background: bool = True) -> Image.Image:
    big = size * SUPERSAMPLE
    canvas = (
        radial_background(big)
        if with_background
        else Image.new("RGBA", (big, big), (0, 0, 0, 0))
    )

    points = triangle_geometry(big, width_ratio)
    canvas.alpha_composite(deity_plate(big, points))

    # Gold edge, drawn twice: a soft glow beneath, then the crisp stroke.
    glow = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    ImageDraw.Draw(glow).polygon(points, outline=GOLD + (150,), width=int(big * 0.020))
    glow = glow.filter(ImageFilter.GaussianBlur(big * 0.020))
    canvas.alpha_composite(glow)

    edge = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(edge)
    draw.polygon(points, outline=GOLD + (255,), width=max(2, int(big * 0.023)))
    # a paler pass on the upper edge, echoing the site's gradient stroke
    draw.line([points[1], points[2]], fill=GOLD_PALE + (255,), width=max(2, int(big * 0.023)))
    canvas.alpha_composite(edge)

    return canvas.resize((size, size), Image.LANCZOS)


def main() -> None:
    os.makedirs(PUBLIC_ICONS, exist_ok=True)

    # --- PWA / browser ------------------------------------------------------
    pwa = {
        "icon-512.png": (512, 0.60, True),
        "icon-192.png": (192, 0.60, True),
        "icon-180.png": (180, 0.60, True),
        "favicon-32.png": (32, 0.66, True),
        # Maskable: the launcher mask may crop to a circle of 80% diameter, so
        # the mark is pulled well inside that safe zone.
        "icon-512-maskable.png": (512, 0.42, True),
    }
    for name, (size, ratio, bg) in pwa.items():
        image = build(size, ratio, bg)
        if name == "favicon-32.png":
            image = image.convert("RGB")
        image.save(os.path.join(PUBLIC_ICONS, name), "PNG", optimize=True)
        print(f"{name:26} {size}x{size}  {os.path.getsize(os.path.join(PUBLIC_ICONS, name)) / 1024:7.1f} KB")

    # --- Android ------------------------------------------------------------
    DENSITIES = {"mdpi": (48, 108), "hdpi": (72, 162), "xhdpi": (96, 216), "xxhdpi": (144, 324), "xxxhdpi": (192, 432)}
    for density, (legacy_px, fg_px) in DENSITIES.items():
        folder = os.path.join(ANDROID_RES, f"mipmap-{density}")
        os.makedirs(folder, exist_ok=True)

        legacy = build(legacy_px, 0.60, True).convert("RGB")
        legacy.save(os.path.join(folder, "ic_launcher.png"), "PNG", optimize=True)

        # Round slot: the square icon already reads as a mark; mask it.
        big = legacy_px * SUPERSAMPLE
        square = build(big, 0.60, True)
        mask = Image.new("L", (big, big), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, big - 1, big - 1), fill=255)
        rounded = Image.new("RGBA", (big, big), (0, 0, 0, 0))
        rounded.paste(square, (0, 0), mask)
        rounded.resize((legacy_px, legacy_px), Image.LANCZOS).convert("RGB").save(
            os.path.join(folder, "ic_launcher_round.png"), "PNG", optimize=True
        )

        # Adaptive foreground: transparent, mark inside Android's 66% safe zone.
        fg = build(fg_px, 0.44, False)
        fg.save(os.path.join(folder, "ic_launcher_foreground.png"), "PNG", optimize=True)

        print(f"mipmap-{density}: legacy {legacy_px}px, foreground {fg_px}px")


if __name__ == "__main__":
    main()
