import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, readFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLI = 'plugins/solution-architect/skills/analyze-requirements/scripts/likec4-export.mjs';

// Same stub-npx shape as likec4-gen-cli.test.mjs: the export contract is tested
// without reaching the network. The stub writes STUB_JSON to whatever follows
// --outfile, which is how the shape guard is exercised with both shapes.
function stubNpx() {
  const bin = mkdtempSync(join(tmpdir(), 'analyze-requirements-bin-'));
  const log = join(bin, 'calls.log');
  const npx = join(bin, 'npx');
  writeFileSync(npx, [
    '#!/bin/sh',
    `echo "$@" >> ${JSON.stringify(log)}`,
    'prev=""',
    'for a in "$@"; do',
    '  [ "$prev" = "--outfile" ] && printf %s "$STUB_JSON" > "$a"',
    '  prev="$a"',
    'done',
    'exit 0',
  ].join('\n'));
  chmodSync(npx, 0o755);
  return { bin, log };
}

function runCli(bin, json, args) {
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, STUB_JSON: json };
  return execFileSync('node', [CLI, ...args], { encoding: 'utf8', env, stdio: 'pipe' });
}

const MODEL = '{"elements":{"shop":{"kind":"system","title":"Shop"}}}';

test('the export is pinned to the arch-docs project', () => {
  const { bin, log } = stubNpx();
  const out = join(mkdtempSync(join(tmpdir(), 'analyze-requirements-out-')), 'model.json');
  runCli(bin, MODEL, ['--dir', '/m', '--out', out]);
  assert.match(readFileSync(log, 'utf8'), /export json --project arch-docs/);
});

test('a single-project model with elements passes and prints the outfile', () => {
  const { bin } = stubNpx();
  const out = join(mkdtempSync(join(tmpdir(), 'analyze-requirements-out-')), 'model.json');
  assert.equal(runCli(bin, MODEL, ['--dir', '/m', '--out', out]).trim(), out);
});

test('an array of project objects is refused with a shape error', () => {
  const { bin } = stubNpx();
  const out = join(mkdtempSync(join(tmpdir(), 'analyze-requirements-out-')), 'model.json');
  assert.throws(() => runCli(bin, `[${MODEL}]`, ['--dir', '/m', '--out', out]), /elements/);
});

test('the CLI fails loudly without a model directory or an outfile', () => {
  const { bin } = stubNpx();
  assert.throws(() => runCli(bin, MODEL, ['--out', '/m.json']));
  assert.throws(() => runCli(bin, MODEL, ['--dir', '/m']));
});
