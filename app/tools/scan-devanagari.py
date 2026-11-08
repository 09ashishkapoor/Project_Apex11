"""Report where Devanagari is intact and where it was mangled by a Latin-1
round-trip. `ॐ` (U+0950) corrupted this way becomes `à¥<U+0081>`-style pairs,
so a file is either fine or visibly not."""
import pathlib

APP = pathlib.Path(__file__).resolve().parent.parent
REPO = APP.parent
SELF = pathlib.Path(__file__).resolve()

TARGETS = [
    p
    for p in [
        *sorted((APP / "src").rglob("*.ts")),
        *sorted((APP / "src").rglob("*.tsx")),
        *sorted((APP / "src").rglob("*.css")),
        *sorted((APP / "tools").rglob("*.mjs")),
        *sorted((APP / "tools").rglob("*.py")),
        APP / "README.md",
        REPO / "lib" / "data" / "deities.dart",
    ]
    if p.resolve() != SELF
]

# Devanagari block, plus the Latin-1 range that mojibake of it lands in.
DEVANAGARI = range(0x0900, 0x0980)
MOJIBAKE_HINT = {"à", "á", "â", "ã", "\u0081", "¥", "¦", "§"}


def classify(text: str) -> tuple[int, int]:
    good = sum(1 for ch in text if ord(ch) in DEVANAGARI)
    bad = sum(1 for ch in text if ch == "à") + sum(1 for ch in text if ch == "à¥")
    return good, bad


def main() -> None:
    for path in TARGETS:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        good, bad = classify(text)
        if good or bad:
            state = "OK" if good and not bad else "MANGLED"
            print(f"{state:8} devanagari={good:3d} suspect={bad:3d}  {path.relative_to(REPO)}")


if __name__ == "__main__":
    main()
