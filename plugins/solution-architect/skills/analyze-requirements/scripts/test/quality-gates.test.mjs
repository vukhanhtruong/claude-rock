import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const base = new URL('../..', import.meta.url).pathname;
const targets = ['scripts/lib', 'scripts', 'workflows']
  .flatMap((d) => readdirSync(join(base, d), { withFileTypes: true })
    .filter((e) => e.isFile() && /\.(mjs|js)$/.test(e.name))
    .map((e) => join(base, d, e.name)));

const functionSpans = (src) => {
  const spans = [];
  const starts = [...src.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+\w+|=>\s*\{/g)];
  for (const m of starts) {
    let depth = 0; let lines = 1;
    for (let i = src.indexOf('{', m.index); i < src.length; i += 1) {
      if (src[i] === '{') depth += 1;
      if (src[i] === '}') { depth -= 1; if (depth === 0) break; }
      if (src[i] === '\n') lines += 1;
    }
    spans.push(lines);
  }
  return spans;
};

const countParams = (sig) => {
  let depth = 0; let n = sig.trim() ? 1 : 0;
  for (const ch of sig) {
    if ('([{'.includes(ch)) depth += 1;
    if (')]}'.includes(ch)) depth -= 1;
    if (ch === ',' && depth === 0) n += 1;
  }
  return n;
};

const paramCounts = (src) => [
  ...src.matchAll(/function\s+\w+\s*\(([^)]*)\)/g),
  ...src.matchAll(/\(([^)]*)\)\s*=>/g),
].map((m) => countParams(m[1]));

for (const file of targets) {
  const src = readFileSync(file, 'utf8');
  test(`gates: ${file.replace(base, '')}`, () => {
    assert.ok(src.split('\n').length <= 200, 'file over 200 lines');
    const spans = functionSpans(src);
    assert.ok(spans.length <= 10, `${spans.length} functions (max 10)`);
    for (const lines of spans) assert.ok(lines <= 22, `function of ${lines} lines (max 20 + braces)`);
    for (const n of paramCounts(src)) assert.ok(n <= 3, `function with ${n} params (max 3)`);
  });
}
