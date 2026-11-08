"""Remap the app's original warm-brown/amber ramp onto the brand palette
extracted from jaikhyapaparampara.com/styles.css.

The app was built against a palette of the same *family* as the brand (temple
maroon + gold) but with brown-black grounds and amber accents. This rewrites
every remaining literal to the brand's exact values so there is one palette,
not two. The :root token block is already brand-correct and is left alone.
"""
import pathlib
import re

STYLES = pathlib.Path(__file__).resolve().parent.parent / "src" / "styles"

# Old literal -> brand replacement. Order matters: longer/more specific first.
REPLACEMENTS = [
    # ---- grounds ----
    ("#17100c", "#0d0506"),
    ("#17100C", "#0D0506"),
    ("#1e1510", "#180a0f"),
    ("#301c15", "#2d0f18"),
    ("#0d0806", "#0d0506"),
    ("rgba(23, 16, 12,", "rgba(13, 5, 6,"),
    ("rgba(16, 10, 8,", "rgba(13, 5, 6,"),
    ("rgba(18, 11, 9,", "rgba(13, 5, 6,"),
    ("rgba(20, 14, 11,", "rgba(13, 5, 6,"),
    ("rgba(48, 28, 21,", "rgba(45, 15, 24,"),
    # the old brown board wash -> the brand temple gradient stops
    ("linear-gradient(178deg, #1c110d 0%, #190f0c 42%, #150d0a 100%)", "var(--brand-temple-gradient)"),
    # ---- text ramp ----
    ("#f6e9d6", "#f0dcc8"),
    ("rgba(246, 233, 214,", "rgba(240, 220, 200,"),
    ("#fbf0dd", "#fdf5e8"),
    ("#f5e7d1", "#f4e4c1"),
    ("#fcf1de", "#fdf5e8"),
    ("#fff4e3", "#fdf5e8"),
    ("#f8ebd8", "#fdf5e8"),
    ("#f8ebd6", "#fdf5e8"),
    ("#f8edda", "#fdf5e8"),
    ("#fff6e6", "#fdf5e8"),
    ("#f2e3cd", "#f0dcc8"),
    ("#ebdac2", "#f0dcc8"),
    ("#eadac2", "#f0dcc8"),
    ("#e4d3bc", "#f0dcc8"),
    ("#d8c7b0", "#f0dcc8"),
    ("#fff3e1", "#fdf5e8"),
    ("#f8d9a6", "#f4e4c1"),
    # ---- golds ----
    ("#edae55", "#e8c468"),
    ("#EDAE55", "#E8C468"),
    ("rgba(237, 174, 85,", "rgba(232, 196, 104,"),
    ("#f4c77e", "#f4e4c1"),
    ("#d99a46", "#c9a962"),
    ("rgba(226, 162, 76,", "rgba(201, 169, 98,"),
    ("rgba(255, 201, 132,", "rgba(232, 196, 104,"),
    ("rgba(255, 176, 96,", "rgba(201, 169, 98,"),
    ("rgba(255, 241, 214,", "rgba(255, 248, 240,"),
    # ---- the one pill: brand gold, not amber ----
    (
        "linear-gradient(180deg, #f7d197 0%, #edb05d 52%, #e2a24c 100%)",
        "linear-gradient(180deg, #f4e4c1 0%, #e8c468 55%, #c9a962 100%)",
    ),
    ("rgba(239,185,111,", "rgba(201, 169, 98,"),
    # ---- danger ----
    ("#ffd9d2", "#f6cfd4"),
    ("rgba(190, 70, 54, 0.22)", "rgba(139, 38, 53, 0.32)"),
    ("rgba(190, 70, 54, 0.32)", "rgba(139, 38, 53, 0.45)"),
    ("rgba(255, 176, 160, 0.82)", "rgba(246, 207, 212, 0.9)"),
]


def main() -> None:
    changed = {}
    for path in sorted(STYLES.glob("*.css")):
        if path.name == "fonts.css":
            continue
        text = path.read_text(encoding="utf-8")
        before = text
        # Protect only base.css's leading token block, which is already
        # brand-correct. Matching `:root {` naively also hits the one nested
        # inside a media query in session-extra.css, which truncated the file.
        head_end = 0
        if path.name == "base.css" and text.lstrip().startswith(":root {"):
            head_end = text.find("}", text.find(":root {")) + 1
        head, body = text[:head_end], text[head_end:]
        for old, new in REPLACEMENTS:
            body = body.replace(old, new)
        out = head + body
        if out != before:
            path.write_text(out, encoding="utf-8")
            changed[path.name] = sum(
                1 for old, _ in REPLACEMENTS if old in before[head_end:]
            )
    for name, count in sorted(changed.items()):
        print(f"{name}: {count} palette token(s) remapped")
    if not changed:
        print("nothing to change")


if __name__ == "__main__":
    main()
