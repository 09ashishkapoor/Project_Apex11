"""List the distinct non-ASCII sequences in the app sources, so encoding damage
can be repaired with an exact, auditable replacement map."""
import collections
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent

files = [ROOT / "README.md"]
for pattern in ("*.ts", "*.tsx", "*.css", "*.mjs", "*.py"):
    files += sorted((ROOT / "src").rglob(pattern))
    files += sorted((ROOT / "tools").rglob(pattern))

sequences = collections.Counter()
where = collections.defaultdict(list)

for path in files:
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    for match in re.finditer(r"[^\x00-\x7F]+", text):
        chunk = match.group()
        sequences[chunk] += 1
        if len(where[chunk]) < 3:
            where[chunk].append(str(path.relative_to(ROOT)))

for chunk, count in sequences.most_common(50):
    codepoints = " ".join(f"U+{ord(c):04X}" for c in chunk)
    print(f"{count:3d}  {chunk!r}")
    print(f"     {codepoints}")
    print(f"     {', '.join(where[chunk])}")
