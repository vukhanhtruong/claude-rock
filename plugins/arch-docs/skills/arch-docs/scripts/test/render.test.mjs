import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const fixtures = new URL('./fixtures/docs-pass/', import.meta.url).pathname;

test('render.mjs produces a self-contained index.html', () => {
  const out = mkdtempSync(join(tmpdir(), 'arch-docs-render-'));
  const stub = (name, content) => { const p = join(out, name); writeFileSync(p, content); return p; };
  execFileSync('node', [
    'plugins/arch-docs/skills/arch-docs/scripts/render.mjs',
    '--root', fixtures, '--arch', `${fixtures}ARCHITECTURE.md`,
    '--docs', `${fixtures}docs/adr/0001-sample.md`,
    '--out', out,
    '--likec4-bundle', stub('l.js', '/*likec4*/'),
    '--mermaid-bundle', stub('m.js', '/*mermaid*/'),
    '--theme', 'plugins/arch-docs/skills/arch-docs/assets/mermaid-theme.json',
  ]);
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(html, /<h2 id="core-components">/);
  assert.match(html, /href="#core-components"/);
  assert.match(html, /\/\*likec4\*\//);
  assert.match(html, /\/\*mermaid\*\//);
  assert.doesNotMatch(html, /https?:\/\/(?!www\.w3\.org)/);
});

test('render.mjs fails loudly on a missing bundle', () => {
  assert.throws(() => execFileSync('node', [
    'plugins/arch-docs/skills/arch-docs/scripts/render.mjs',
    '--root', fixtures, '--arch', `${fixtures}ARCHITECTURE.md`,
    '--out', mkdtempSync(join(tmpdir(), 'arch-docs-render-')),
    '--likec4-bundle', '/nope/l.js', '--mermaid-bundle', '/nope/m.js',
    '--theme', 'plugins/arch-docs/skills/arch-docs/assets/mermaid-theme.json',
  ]));
});
