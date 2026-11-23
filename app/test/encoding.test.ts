import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Guards the app's text against the encoding damage that has shipped twice:
 * files rewritten through a Windows-1252 reader (the `Get-Content`/`Set-Content`
 * round trip) turn `—` into `â€”` and `·` into `Â·`. `tools/fix-encoding.py`
 * repairs it; this test fails before it can reach a devotee again.
 *
 * Characters are written as escapes so this file cannot trip its own check.
 */
const APP = fileURLToPath(new URL('..', import.meta.url));

/** Leading characters of UTF-8 text that was decoded as Windows-1252. */
const MOJIBAKE =
  /[\u00c2\u00c3\u00e2][\u0080-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2020\u2021\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]/;

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const FILES = [
  join(APP, 'index.html'),
  join(APP, 'README.md'),
  ...walk(join(APP, 'src')),
].filter((file) => /\.(ts|tsx|css|html|md)$/.test(file));

describe('source encoding', () => {
  it('has no mojibake in anything the app renders or explains', () => {
    const damaged: string[] = [];
    for (const file of FILES) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (MOJIBAKE.test(line)) {
          damaged.push(`${relative(APP, file)}:${index + 1}  ${line.trim()}`);
        }
      });
    }
    expect(damaged).toEqual([]);
  });

  it('carries no stray byte-order marks', () => {
    const marked = FILES.filter((file) => readFileSync(file, 'utf8').includes('\ufeff'));
    expect(marked.map((file) => relative(APP, file))).toEqual([]);
  });
});
