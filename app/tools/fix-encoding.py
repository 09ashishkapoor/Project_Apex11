"""Repair UTF-8 text that was round-tripped through a Windows-1252 reader.

Rewriting files with `Get-Content | Set-Content` in PowerShell read the UTF-8
bytes as Windows-1252 and wrote them back as UTF-8, so `—` became `—`: three
characters instead of one. This applies an exact, auditable replacement map and
also strips stray byte-order marks left mid-file.

Run with `--write` to apply; without it, prints what would change.
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

REPLACEMENTS = {
    # first-order damage: UTF-8 read as Windows-1252, written back as UTF-8
    "\u00e2\u20ac\u201d": "\u2014",  # em dash
    "\u00e2\u20ac\u201c": "\u2013",  # en dash
    "\u00e2\u20ac\u00a6": "\u2026",  # ellipsis
    "\u00e2\u2020\u2019": "\u2192",  # right arrow
    "\u00e2\u20ac\u2122": "\u2019",  # right single quote
    "\u00e2\u20ac\u0153": "\u201c",  # left double quote
    "\u00e2\u20ac\u009d": "\u201d",  # right double quote
    "\u00c2\u00b7": "\u00b7",        # middle dot
    "\u00c2\u00a0": "\u00a0",        # no-break space
    # second-order damage: the same file round-tripped twice
    "\u00c3\u0192\u2014": "\u00d7",  # multiplication sign
    "\u00c3\u00a2\u00e2\u201a\u00ac": "\u00e2\u20ac",  # repaired on the next pass
    "\u00e1\u00b9\u2021": "\u1e47",  # n with dot below (trikoṇa)
    "\u00e1\u00b9\u2030": "\u1e63",  # s with dot below
    "\u00e1\u00ba\u00b9": "\u1e3b",  # l with dot below
    "\u00c5\u201b": "\u015b",        # s with acute
    "\u00c4\u00ab": "\u012b",        # i with macron
}

DRY_RUN = "--write" not in sys.argv


def targets() -> list[pathlib.Path]:
    files = [ROOT / "README.md", ROOT / "package.json", ROOT / "index.html"]
    for pattern in ("*.ts", "*.tsx", "*.css", "*.mjs", "*.py", "*.md"):
        for folder in ("src", "tools"):
            files += sorted((ROOT / folder).rglob(pattern))
    return [f for f in files if f.exists() and f.name not in {"fonts.css", "scan-encoding.py"}]


def main() -> None:
    changed = 0
    for path in targets():
        original = path.read_text(encoding="utf-8")
        text = original.replace("\ufeff", "")
        hits = 0
        for bad, good in REPLACEMENTS.items():
            if bad in text:
                hits += text.count(bad)
                text = text.replace(bad, good)

        if text == original:
            continue

        if DRY_RUN:
            print(f"WOULD {path.relative_to(ROOT)}  ({hits} sequence(s))")
        else:
            path.write_text(text, encoding="utf-8", newline="\n")
            print(f"FIXED {path.relative_to(ROOT)}  ({hits} sequence(s))")
        changed += 1

    verb = "repairable" if DRY_RUN else "repaired"
    print(f"\n{changed} file(s) {verb}" + ("  (dry run, pass --write)" if DRY_RUN else ""))


if __name__ == "__main__":
    main()
