import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCliArgs, UsageError } from '../src/cli/args.mjs';

test('defaults to install with empty selections', () => {
  assert.deepEqual(parseCliArgs([]), {
    command: 'install', plugins: [], agents: [], force: false, help: false, version: false,
  });
});

test('parses long flags, repeatable', () => {
  const r = parseCliArgs(['--plugin', 'a', '--plugin', 'b', '--agent', 'codex', '--force']);
  assert.deepEqual(r.plugins, ['a', 'b']);
  assert.deepEqual(r.agents, ['codex']);
  assert.equal(r.force, true);
});

test('parses short aliases', () => {
  const r = parseCliArgs(['-p', 'arch-docs', '-a', 'claude', '-f']);
  assert.deepEqual(r.plugins, ['arch-docs']);
  assert.deepEqual(r.agents, ['claude']);
  assert.equal(r.force, true);
});

test('parses uninstall command', () => {
  assert.equal(parseCliArgs(['uninstall']).command, 'uninstall');
});

test('rejects unknown command', () => {
  assert.throws(() => parseCliArgs(['destroy']), UsageError);
});

test('rejects extra positionals', () => {
  assert.throws(() => parseCliArgs(['install', 'extra']), UsageError);
});

test('rejects unknown flag', () => {
  assert.throws(() => parseCliArgs(['--bogus']), UsageError);
});

test('rejects unknown agent with valid list in message', () => {
  assert.throws(() => parseCliArgs(['-a', 'gemini']), /claude, codex/);
});

test('parses help and version', () => {
  assert.equal(parseCliArgs(['-h']).help, true);
  assert.equal(parseCliArgs(['-v']).version, true);
});
