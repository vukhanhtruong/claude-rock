import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripRemoteAssets } from '../lib/offline.mjs';

const FONT_CSS = "@font-face{font-family:IBM Plex Sans Variable;src:url(https://cdn.jsdelivr.net/x.woff2)format('woff2-variations');}";

test('replaces a remote webfont source with a local() source', () => {
  const out = stripRemoteAssets(FONT_CSS);
  assert.doesNotMatch(out, /url\(https?:/);
  assert.match(out, /src:local\(system-ui\);/);
});

test('leaves svg fragment refs and data uris alone', () => {
  const js = 'a=`url(#drop-shadow)`;b=`url("data:image/svg+xml;base64,AAA")`';
  assert.equal(stripRemoteAssets(js), js);
});

test('keeps the host bundle valid whatever js quote style wraps the css', () => {
  const cases = {
    double: `var css = "${FONT_CSS}";`,
    single: `var css = '${FONT_CSS.replace(/'/g, '"')}';`,
    backtick: `var css = \`${FONT_CSS.replace(/'/g, '"')}\`;`,
  };
  for (const [style, src] of Object.entries(cases)) {
    const out = stripRemoteAssets(src);
    assert.doesNotMatch(out, /url\(https?:/, `${style}: url not stripped`);
    assert.doesNotThrow(() => new Function(out), `${style}: broke the host string literal`);
  }
});
