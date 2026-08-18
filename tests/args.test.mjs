import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCliArgs, UsageError } from '../src/cli/args.mjs';

test('defaults to install with empty selections and no scope', () => {
  assert.deepEqual(parseCliArgs([]), {
    command: 'install', plugins: [], agents: [], scope: null, dir: null,
    yes: false, force: false, help: false, version: false,
  });
});

test('parses long flags, repeatable', () => {
  const r = parseCliArgs(['--plugin', 'a', '--plugin', 'b', '--agent', 'codex', '--force']);
  assert.deepEqual(r.plugins, ['a', 'b']);
  assert.deepEqual(r.agents, ['codex']);
  assert.equal(r.force, true);
});

test('parses short aliases', () => {
  const r = parseCliArgs(['-p', 'solution-architect', '-a', 'claude', '-f']);
  assert.deepEqual(r.plugins, ['solution-architect']);
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

test('-g and --global select user scope', () => {
  assert.equal(parseCliArgs(['-g']).scope, 'user');
  assert.equal(parseCliArgs(['--global']).scope, 'user');
});

test('--project selects project scope', () => {
  assert.equal(parseCliArgs(['--project']).scope, 'project');
});

test('rejects --global together with --project', () => {
  assert.throws(() => parseCliArgs(['--global', '--project']), UsageError);
});

test('parses -y and --yes', () => {
  assert.equal(parseCliArgs(['-y']).yes, true);
  assert.equal(parseCliArgs(['--yes']).yes, true);
});

test('--dir carries the path and implies project scope', () => {
  const r = parseCliArgs(['--dir', '/work/app']);
  assert.equal(r.dir, '/work/app');
  assert.equal(r.scope, 'project');
});

test('rejects --dir combined with --global', () => {
  assert.throws(() => parseCliArgs(['--dir', '/work/app', '--global']), UsageError);
});

test('--dir agrees with an explicit --project', () => {
  const r = parseCliArgs(['--dir', '/work/app', '--project']);
  assert.equal(r.scope, 'project');
  assert.equal(r.dir, '/work/app');
});
