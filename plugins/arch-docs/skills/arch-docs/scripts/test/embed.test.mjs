import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embed } from '../lib/embed.mjs';

test('replaces every slot marker', () => {
  const out = embed({
    template: '<body><!-- slot:DOC --><script><!-- slot:MERMAID --></script></body>',
    slots: { DOC: '<h1>hi</h1>', MERMAID: 'window.m=1' },
  });
  assert.match(out, /<h1>hi<\/h1>/);
  assert.match(out, /window\.m=1/);
});

test('throws on marker without slot', () => {
  assert.throws(() => embed({ template: '<!-- slot:MISSING -->', slots: {} }), /MISSING/);
});

test('throws on slot without marker', () => {
  assert.throws(() => embed({ template: 'no markers', slots: { EXTRA: 'x' } }), /EXTRA/);
});

test('does not re-expand slot content containing marker-shaped text', () => {
  const out = embed({
    template: '<!-- slot:A -->AFTER<!-- slot:A -->',
    slots: { A: '<!-- slot:A -->INJECTED' },
  });
  assert.strictEqual(out, '<!-- slot:A -->INJECTEDAFTER<!-- slot:A -->INJECTED');
});
