"""Repair UTF-8 that was round-tripped through a Windows code page.

A single `text.encode('cp1252')` cannot reverse it here: the damage is mixed.
Bytes 0x80-0x9F that cp1252 defines came back as their cp1252 characters (€ ƒ † •),
while the ones cp1252 leaves undefined came back as latin-1 control characters
(U+0081, U+008D, U+0090). So we map each character back to the byte it was
originally read from — cp1252 where it defines that character, otherwise its own
code point — reassemble the byte string, and decode it as UTF-8.
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TARGETS = [ROOT / "docs" / "index.html", ROOT / "tool" / "og-card.html"]

# character -> original byte, for everything cp1252 defines
_CP1252_BYTE = {}
for _b in range(256):
    try:
        _CP1252_BYTE.setdefault(bytes([_b]).decode("cp1252"), _b)
    except UnicodeDecodeError:
        continue


def to_bytes(text: str) -> bytes | None:
    out = bytearray()
    for ch in text:
        if ch == "\ufeff":
            continue
        code = ord(ch)
        if code < 0x80:
            out.append(code)
        elif ch in _CP1252_BYTE:
            out.append(_CP1252_BYTE[ch])
        elif code < 0x100:
            out.append(code)
        else:
            return None  # a genuinely correct astral character; not reversible
    return bytes(out)


MARKERS = ("\u00c2", "\u00e2\u20ac", "\u00e3\u0192", "\u00e1\u00b9")


def damage(text: str) -> int:
    return sum(text.count(marker) for marker in MARKERS)


def repair(text: str) -> str | None:
    raw = to_bytes(text)
    if raw is None:
        return None
    try:
        candidate = raw.decode("utf-8")
    except UnicodeDecodeError:
        return None
    if damage(candidate) < damage(text):
        return candidate
    return None


def main() -> None:
    write = "--write" in sys.argv
    for path in TARGETS:
        if not path.exists():
            continue
        original = path.read_text(encoding="utf-8")
        before = damage(original)
        fixed = repair(original)
        if fixed is None:
            print(f"SKIP  {path.relative_to(ROOT)}  ({before} markers; not reversible)")
            continue
        after = damage(fixed)
        deva = sum(1 for ch in fixed if 0x0900 <= ord(ch) < 0x0980)
        if write:
            path.write_text(fixed, encoding="utf-8", newline="\n")
            print(f"FIXED {path.relative_to(ROOT)}  markers {before} -> {after}, {deva} Devanagari chars")
        else:
            print(f"WOULD {path.relative_to(ROOT)}  markers {before} -> {after}, {deva} Devanagari chars")


if __name__ == "__main__":
    main()
