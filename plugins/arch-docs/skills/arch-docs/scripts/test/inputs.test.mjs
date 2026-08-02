import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { buildInputs } from '../lib/inputs.mjs';

const dir = new URL('./fixtures/docs-pass/', import.meta.url).pathname;

test('buildInputs assembles root-relative validator inputs', async () => {
  const inputs = await buildInputs({
    root: dir,
    archPath: `${dir}ARCHITECTURE.md`,
    modelPath: `${dir}model.json`,
    docPaths: [`${dir}docs/adr/0001-sample.md`],
  });
  assert.ok(inputs.frontmatter.electedDocs);
  assert.ok(inputs.tables.length >= 3);
  assert.ok(inputs.model.elements.length > 0);
  assert.deepEqual(inputs.files.sort(), ['ARCHITECTURE.md', 'docs/adr/0001-sample.md']);
  assert.ok(inputs.anchors['ARCHITECTURE.md'].includes('core-components'));
  assert.ok(inputs.links.some((l) => l.fromDoc === 'ARCHITECTURE.md' && l.href === 'docs/adr/0001-sample.md'));
});

test('CLI exits 0 on the passing fixture', () => {
  const out = execFileSync('node', [
    'plugins/arch-docs/skills/arch-docs/scripts/validate.mjs',
    '--root', dir,
    '--arch', `${dir}ARCHITECTURE.md`, '--model', `${dir}model.json`,
    '--docs', `${dir}docs/adr/0001-sample.md`,
  ]).toString();
  assert.match(out, /all checks passed/);
});

test('CLI exits 1 when a check fails', () => {
  assert.throws(() => execFileSync('node', [
    'plugins/arch-docs/skills/arch-docs/scripts/validate.mjs',
    '--root', dir,
    '--arch', `${dir}ARCHITECTURE.md`, '--model', `${dir}model-broken.json`,
    '--docs', `${dir}docs/adr/0001-sample.md`,
  ]));
});
