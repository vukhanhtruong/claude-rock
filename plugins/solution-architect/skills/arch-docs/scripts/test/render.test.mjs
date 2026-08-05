import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const fixtures = new URL('./fixtures/docs-pass/', import.meta.url).pathname;

// Shaped like a real likec4 1.59.2 bundle: a serialised theme carrying the
// shared brand hex, and nodes resolving to a palette colour name. render.mjs
// refuses a bundle without this, because that is precisely what a model with no
// palette generates — valid, clean, and blue.
const THEME = JSON.parse(readFileSync(
  new URL('../../assets/mermaid-theme.json', import.meta.url), 'utf8'));
const LIKEC4_STUB = '/*likec4*/`@font-face{src:url(https://cdn.jsdelivr.net/f.woff2)format("woff2")}`'
  + `;primary:{elements:{fill:\`${THEME.likec4.brand}\`,stroke:\`#00524b\`,`
  + 'hiContrast:`#c7ffff`,loContrast:`#b2ffff`}};shape:`rectangle`,color:`primary`';

test('render.mjs produces a self-contained index.html', () => {
  const out = mkdtempSync(join(tmpdir(), 'arch-docs-render-'));
  const stub = (name, content) => { const p = join(out, name); writeFileSync(p, content); return p; };
  execFileSync('node', [
    'plugins/solution-architect/skills/arch-docs/scripts/render.mjs',
    '--root', fixtures, '--arch', `${fixtures}ARCHITECTURE.md`,
    '--docs', `${fixtures}docs/adr/0001-sample.md`,
    '--out', out,
    '--likec4-bundle', stub('l.js', LIKEC4_STUB),
    '--mermaid-bundle', stub('m.js', '/*mermaid*/'),
    '--theme', 'plugins/solution-architect/skills/arch-docs/assets/mermaid-theme.json',
  ]);
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(html, /<h2 id="core-components">/);
  assert.match(html, /href="#core-components"/);
  assert.match(html, /\/\*likec4\*\//);
  assert.match(html, /\/\*mermaid\*\//);
  // The stacks named IBM Plex on every platform and it resolved on almost none.
  // Embedded at render time rather than committed, like the two bundles above.
  assert.match(html, /@font-face\{font-family:'IBM Plex Sans'/);
  assert.match(html, /url\(data:font\/woff2;base64,/);
  assert.doesNotMatch(html, /url\(https?:/);
  assert.doesNotMatch(html, /https?:\/\/(?!www\.w3\.org)/);
  // ARCHITECTURE.md heads its own section. Anything under docs/adr/ is a record:
  // §14 Decisions already tables every one of them, so it opens in a drawer over
  // that table and gets no rail row of its own.
  assert.match(html, /nav-sec__title[^>]*>Architecture</);
  assert.doesNotMatch(html, /nav-sec__title[^>]*>Decision Records</);
  // Still in the document, though — a drawer needs something to show, and the
  // route is what makes it linkable.
  assert.match(html, /<div class="doc-section"[^>]*data-drawer/);
  assert.match(html, /class="page"[^>]*data-route="0001-sample"/);
});

// The estimation companion is the argument; the estimate skill's page beside
// it is the same numbers made interactive. The viewer links it when — and only
// when — the file exists, so an md-only run renders exactly as before.
test('the estimation companion links a sibling estimate.html', () => {
  const out = mkdtempSync(join(tmpdir(), 'arch-docs-render-'));
  const stub = (name, content) => { const p = join(out, name); writeFileSync(p, content); return p; };
  execFileSync('node', [
    'plugins/solution-architect/skills/arch-docs/scripts/render.mjs',
    '--root', fixtures, '--arch', `${fixtures}ARCHITECTURE.md`,
    '--docs', `${fixtures}docs/estimation.md`,
    '--out', out,
    '--likec4-bundle', stub('l.js', LIKEC4_STUB),
    '--mermaid-bundle', stub('m.js', '/*mermaid*/'),
    '--theme', 'plugins/solution-architect/skills/arch-docs/assets/mermaid-theme.json',
  ]);
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(html, /class="page"[^>]*data-kind="estimation"/);
  assert.match(html, /class="estimate-link"><a href="[^"]*estimate\.html"/);
});

test('render.mjs fails loudly on a missing bundle', () => {
  assert.throws(() => execFileSync('node', [
    'plugins/solution-architect/skills/arch-docs/scripts/render.mjs',
    '--root', fixtures, '--arch', `${fixtures}ARCHITECTURE.md`,
    '--out', mkdtempSync(join(tmpdir(), 'arch-docs-render-')),
    '--likec4-bundle', '/nope/l.js', '--mermaid-bundle', '/nope/m.js',
    '--theme', 'plugins/solution-architect/skills/arch-docs/assets/mermaid-theme.json',
  ]));
});

test('render.mjs throws loudly if a bundle contains a literal </script>', () => {
  const out = mkdtempSync(join(tmpdir(), 'arch-docs-render-'));
  const stub = (name, content) => { const p = join(out, name); writeFileSync(p, content); return p; };
  assert.throws(() => execFileSync('node', [
    'plugins/solution-architect/skills/arch-docs/scripts/render.mjs',
    '--root', fixtures, '--arch', `${fixtures}ARCHITECTURE.md`,
    '--out', out,
    '--likec4-bundle', stub('l.js', LIKEC4_STUB + 'var s = "</script>";'),
    '--mermaid-bundle', stub('m.js', '/*mermaid*/'),
    '--theme', 'plugins/solution-architect/skills/arch-docs/assets/mermaid-theme.json',
  ]));
});

// The failure this exists for: a valid model with no palette generates a clean
// bundle, exit 0, every node LikeC4 default blue, and nothing anywhere says so.
test('render.mjs refuses a likec4 bundle with no palette', () => {
  const out = mkdtempSync(join(tmpdir(), 'arch-docs-render-'));
  const stub = (name, content) => { const p = join(out, name); writeFileSync(p, content); return p; };
  assert.throws(() => execFileSync('node', [
    'plugins/solution-architect/skills/arch-docs/scripts/render.mjs',
    '--root', fixtures, '--arch', `${fixtures}ARCHITECTURE.md`,
    '--out', out,
    '--likec4-bundle', stub('l.js', '/*likec4*/;shape:`rectangle`,color:`primary`'),
    '--mermaid-bundle', stub('m.js', '/*mermaid*/'),
    '--theme', 'plugins/solution-architect/skills/arch-docs/assets/mermaid-theme.json',
  ]), /palette|likec4\.config\.json/i);
});
