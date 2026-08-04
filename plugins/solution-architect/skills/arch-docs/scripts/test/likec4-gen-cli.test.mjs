import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, readFileSync, existsSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLI = 'plugins/solution-architect/skills/arch-docs/scripts/likec4-gen.mjs';

// A stub `npx` on PATH, so the gate is tested without reaching the network and
// without depending on which likec4 the machine happens to resolve. It logs
// every invocation, which is how "gen never ran" is asserted rather than assumed.
function stubNpx(validateExit) {
  const bin = mkdtempSync(join(tmpdir(), 'arch-docs-bin-'));
  const log = join(bin, 'calls.log');
  const npx = join(bin, 'npx');
  writeFileSync(npx, [
    '#!/bin/sh',
    `echo "$@" >> ${JSON.stringify(log)}`,
    `[ "$2" = validate ] && exit ${validateExit}`,
    'exit 0',
  ].join('\n'));
  chmodSync(npx, 0o755);
  return { bin, log };
}

function modelDir(withConfig) {
  const dir = mkdtempSync(join(tmpdir(), 'arch-docs-model-'));
  if (withConfig) writeFileSync(join(dir, 'likec4.config.json'), '{}');
  return dir;
}

function runCli(bin, args) {
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  return execFileSync('node', [CLI, ...args], { encoding: 'utf8', env, stdio: 'pipe' });
}

test('a model that validates clean is generated', () => {
  const { bin, log } = stubNpx(0);
  const dir = modelDir(true);
  const out = runCli(bin, ['--dir', dir, '--out', '/b.js']).trim();
  const calls = readFileSync(log, 'utf8');
  assert.match(calls, new RegExp(`likec4 validate ${dir}`));
  assert.match(calls, /gen webcomponent --webcomponent-prefix c4/);
  assert.equal(out, '/b.js');
});

// The failure this exists for: gen exits 0 on a broken workspace, so a bundle
// gets built and rendered and nothing says the model never parsed.
test('a model that fails validation is never generated', () => {
  const { bin, log } = stubNpx(1);
  const dir = modelDir(true);
  assert.throws(() => runCli(bin, ['--dir', dir, '--out', '/b.js']));
  const calls = readFileSync(log, 'utf8');
  assert.match(calls, new RegExp(`likec4 validate ${dir}`));
  assert.doesNotMatch(calls, /gen webcomponent/, 'gen ran after validate failed');
});

test('the CLI fails loudly without a model directory or an outfile', () => {
  const { bin } = stubNpx(0);
  assert.throws(() => runCli(bin, ['--out', '/b.js']));
  assert.throws(() => runCli(bin, ['--dir', modelDir(true)]));
});

// The config carries the palette, and LikeC4 reads it from the model folder. A
// run that skips it generates blue diagrams that validate and generate clean, so
// the same gate refuses it — and refuses it before spending a likec4 run, which
// is also how the test proves the check is not merely a later warning.
test('generating without the palette config is refused before likec4 runs', () => {
  const { bin, log } = stubNpx(0);
  assert.throws(() => runCli(bin, ['--dir', modelDir(false), '--out', '/b.js']));
  assert.equal(existsSync(log), false, 'likec4 ran before the config was checked');
});
