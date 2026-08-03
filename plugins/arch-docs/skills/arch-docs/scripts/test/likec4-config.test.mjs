import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildLikec4Config } from '../lib/likec4-config.mjs';
import { validatePalette } from '../lib/validate-palette.mjs';

const theme = JSON.parse(
  readFileSync(new URL('../../assets/mermaid-theme.json', import.meta.url), 'utf8'));

// The brand invariant used to be prose in references/likec4.md, carried out by
// whoever wrote the model. A model that simply omitted it was valid, generated
// clean, and shipped LikeC4's default blue beside teal mermaid diagrams with no
// signal anywhere. The plugin owns the palette now.
test('the config is built from the one palette both renderers are cut from', () => {
  const cfg = buildLikec4Config(theme);
  const colors = cfg.styles.theme.colors;
  assert.equal(colors.primary, theme.likec4.brand);
  // secondary/muted/gray are the neutral end of the same two-colour palette.
  for (const name of ['secondary', 'muted', 'gray']) {
    assert.equal(colors[name], theme.likec4.muted, `${name} is off-palette`);
  }
});

// LikeC4 derives stroke and both contrast shades from a single hex — verified
// against 1.59.2: #0f766e yields stroke #00524b and hiContrast #c7ffff, which
// are exactly the values mermaid-theme.json already records. Writing the
// derived values ourselves would be inventing numbers we do not own.
test('each colour is one hex, not a hand-written triple', () => {
  const colors = buildLikec4Config(theme).styles.theme.colors;
  for (const [name, value] of Object.entries(colors)) {
    assert.equal(typeof value, 'string', `${name} should be a single hex`);
    assert.match(value, /^#[0-9a-f]{6}$/i);
  }
});

test('the default colour is pinned rather than left to LikeC4', () => {
  assert.equal(buildLikec4Config(theme).styles.defaults.color, 'primary');
});

// Shapes taken from real likec4 1.59.2 bundles.
const NODE = (c) => `shape:\`rectangle\`,color:\`${c}\``;
const THEMED = (hex) => `primary:{elements:{fill:\`${hex}\`,stroke:\`#00524b\`,`
  + `hiContrast:\`#c7ffff\`,loContrast:\`#b2ffff\`}}`;

// This is the case that actually shipped: valid model, clean generate, exit 0,
// and every node painted LikeC4 default blue. A bundle generated without the
// config carries no serialised theme at all, so its absence is the signal.
test('a bundle generated without the config is caught', () => {
  const bundle = `var x=1;${NODE('primary')};${NODE('primary')}`;
  const found = validatePalette({ bundle, theme });
  assert.equal(found.length, 1);
  assert.match(found[0], /no theme palette|likec4\.config\.json/i);
});

test('a bundle carrying the palette passes', () => {
  const bundle = `${THEMED(theme.likec4.brand)};${NODE('primary')};${NODE('muted')}`;
  assert.deepEqual(validatePalette({ bundle, theme }), []);
});

test('a palette that drifted from the shared hex is caught', () => {
  const found = validatePalette({ bundle: `${THEMED('#3b82f6')};${NODE('primary')}`, theme });
  assert.equal(found.length, 1);
  assert.match(found[0], /#3b82f6/);
});

// Counting hexes cannot catch this: a model declaring its own colour leaves the
// brand hex sitting in the bundle's colour registry, defined and unpainted. The
// resolved node colour is the only thing that says what is drawn.
test('nodes painted a colour outside the palette are caught', () => {
  const bundle = `${THEMED(theme.likec4.brand)};${NODE('primary')};${NODE('ownblue')}`;
  const found = validatePalette({ bundle, theme });
  assert.equal(found.length, 1);
  assert.match(found[0], /ownblue/);
});
