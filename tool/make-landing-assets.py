"""Prepare the landing page assets from material that already exists.

Nothing here invents artwork: the fonts are the app's own self-hosted faces, the
screenshots come from the running build, and the deity images come straight out
of the app. The social card is rendered from HTML separately so its type is real.
"""
import pathlib
import shutil

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent
APP = REPO / "app"
DOCS = REPO / "docs"
ASSETS = DOCS / "assets"

FONTS = APP / "src" / "styles" / "fonts"
SHOTS = APP / ".shots"
IMAGES = APP / "public" / "img"


def ensure_dirs() -> None:
    for sub in ("fonts", "shots", "altars"):
        (ASSETS / sub).mkdir(parents=True, exist_ok=True)


def copy_fonts() -> None:
    wanted = [
        "philosopher-latin-normal-400.woff2",
        "philosopher-latin-normal-700.woff2",
        "crimson-text-latin-normal-400.woff2",
        "crimson-text-latin-normal-600.woff2",
        "crimson-text-latin-italic-400.woff2",
        "noto-sans-devanagari-devanagari-normal-400600.woff2",
    ]
    for name in wanted:
        src = FONTS / name
        if not src.exists():
            raise SystemExit(f"missing font: {src}")
        shutil.copy2(src, ASSETS / "fonts" / name)
    total = sum((ASSETS / "fonts" / n).stat().st_size for n in wanted)
    print(f"fonts        {len(wanted)} files  {total / 1024:6.0f} KB")


def shots() -> None:
    wanted = {
        "01-today.png": "today.jpg",
        "05-session-counted.png": "session.jpg",
        "07-blessing.png": "blessing.jpg",
        "09-ledger.png": "ledger.jpg",
        "02-altar.png": "altar.jpg",
    }
    for src_name, out_name in wanted.items():
        src = SHOTS / src_name
        if not src.exists():
            raise SystemExit(f"missing screenshot: {src}")
        image = Image.open(src).convert("RGB")
        width = 700
        image = image.resize((width, round(image.height * width / image.width)), Image.LANCZOS)
        image.save(ASSETS / "shots" / out_name, "JPEG", quality=84, optimize=True)
    total = sum(p.stat().st_size for p in (ASSETS / "shots").glob("*.jpg"))
    print(f"screenshots  {len(wanted)} files  {total / 1024:6.0f} KB")


def altars() -> None:
    """Trim the bottom edge of each photograph.

    The source files carry small captions and watermarks baked into the very
    bottom of the frame ("Type: Wall Statue", "Jai Bhairav Baba"). They are
    invisible inside the app, where the plate crops and tints the image, but the
    landing page shows the whole frame — so the bottom 14% is cropped away here.
    """
    wanted = [
        "adya-mahakali.jpg",
        "batuk-bhairav.jpg",
        "swarnaakarshana-bhairav.jpg",
        "skanda-bhairav.jpg",
    ]
    for name in wanted:
        src = IMAGES / name
        if not src.exists():
            raise SystemExit(f"missing image: {src}")
        image = Image.open(src).convert("RGB")
        width, height = image.size
        image = image.crop((0, 0, width, int(height * 0.86)))
        target = 420
        image = image.resize((target, round(image.height * target / image.width)), Image.LANCZOS)
        image.save(ASSETS / "altars" / name, "JPEG", quality=82, optimize=True)
    total = sum(p.stat().st_size for p in (ASSETS / "altars").glob("*.jpg"))
    print(f"altars       {len(wanted)} files  {total / 1024:6.0f} KB")


def main() -> None:
    ensure_dirs()
    copy_fonts()
    shots()
    altars()
    print("\nassets ready in docs/assets/")


if __name__ == "__main__":
    main()
