import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPINE_TITLES, sectionHelp, serialiseHelp } from '../lib/section-help.mjs';

const help = sectionHelp();

// references/writing.md states the spine headings never change, which is what
// makes the heading text a usable key. If a heading is renamed there, this test
// is the thing that says the explainer no longer reaches it.
test('every canonical spine heading has an explainer', () => {
  assert.equal(SPINE_TITLES.length, 16);
  for (const title of SPINE_TITLES) {
    assert.ok(help.spine[title], `no explainer for "${title}"`);
  }
});

// An entry keyed on a heading that does not exist is dead weight that looks
// like coverage.
test('no explainer is keyed on a heading that does not exist', () => {
  assert.deepEqual(Object.keys(help.spine).sort(), [...SPINE_TITLES].sort());
});

test('the three elected companions have an explainer and nothing else does', () => {
  assert.deepEqual(Object.keys(help.companions).sort(),
    ['domain-overview', 'estimation', 'threat-model']);
});

// An empty field renders as a blank row in the panel, which reads as a bug
// rather than as an absence.
test('every explainer states all three fields', () => {
  const all = [...Object.entries(help.spine), ...Object.entries(help.companions)];
  assert.equal(all.length, 19);
  for (const [key, entry] of all) {
    for (const field of ['what', 'why', 'good']) {
      assert.equal(typeof entry[field], 'string', `${key}.${field} is not a string`);
      assert.ok(entry[field].trim().length > 20, `${key}.${field} is too short to help`);
    }
  }
});

// The JSON is embedded into an inline <script> the same way THEME is. Prose is
// author-written and may legitimately contain "<", so an unescaped "</script"
// anywhere in it would end the element early and inject the rest as markup.
// themeJson gets away with a raw splice because a palette file is hex and keys;
// this is sentences.
test('serialising escapes every < so it cannot close the script element', () => {
  const out = serialiseHelp({ spine: { X: { what: 'a </script> b', why: 'c', good: 'd' } } });
  assert.doesNotMatch(out, /</);
  assert.match(out, /\\u003c/);
  assert.deepEqual(JSON.parse(out).spine.X.what, 'a </script> b');
});
