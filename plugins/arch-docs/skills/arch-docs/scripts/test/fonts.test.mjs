import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFontFaces } from '../lib/fonts.mjs';

const dir = new URL('../../assets/fonts/', import.meta.url).pathname;

// Two of the three stacks degrade across a genre boundary rather than within
// one: the serif falls Iowan → Charter → Georgia and stays a book serif, but
// IBM Plex Sans falls to whatever system-ui is and IBM Plex Mono to whatever the
// platform calls monospace. Those two are the ones worth the bytes — and
// mermaid-theme.json names both, so the diagrams miss them too.
test('every shipped weight becomes an inline @font-face', () => {
  const css = buildFontFaces(dir);
  assert.match(css, /font-family:'IBM Plex Sans'/);
  assert.match(css, /font-family:'IBM Plex Mono'/);
  for (const w of [400, 500, 600]) assert.match(css, new RegExp(`font-weight:${w}`));
  assert.equal((css.match(/@font-face/g) || []).length, 5, 'sans 400/500/600 + mono 400/600');
});

test('the faces carry their own bytes and fetch nothing', () => {
  const css = buildFontFaces(dir);
  assert.match(css, /url\(data:font\/woff2;base64,[A-Za-z0-9+/=]+\) format\('woff2'\)/);
  assert.doesNotMatch(css, /https?:/);
});

// Silent fallback is exactly how the viewer came to name IBM Plex in its CSS on
// machines that have never had it.
test('a missing font directory fails loudly rather than shipping a bare stack', () => {
  assert.throws(() => buildFontFaces('/nope/fonts'));
});

// A directory that exists and holds nothing usable is the same failure as one
// that does not exist, and it must read the same way — an empty string here
// would ship a viewer whose CSS names fonts it has not embedded.
test('a directory with no faces is refused rather than silently empty', () => {
  assert.throws(() => buildFontFaces(new URL('./fixtures/', import.meta.url).pathname),
    /woff2/i);
});
