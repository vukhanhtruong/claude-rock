import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../validate.mjs', import.meta.url));
const fx = (f) => fileURLToPath(new URL(`./fixtures/${f}`, import.meta.url));
const run = (json, md) =>
  execFileSync('node', [script, '--json', fx(json), '--md', fx(md)], { encoding: 'utf8' });

test('validate.mjs exits 0 on the pass pair', () => {
  assert.match(run('requirements-pass.json', 'requirements-pass.md'), /requirements package valid/);
});

test('validate.mjs exits non-zero on a broken package', () => {
  assert.throws(() => run('requirements-fail.json', 'requirements-pass.md'));
});
