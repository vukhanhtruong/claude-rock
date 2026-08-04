import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  rmSync,
  lstatSync,
  existsSync,
  chmodSync,
  writeFileSync,
  unlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/agents-rock.mjs', import.meta.url));

function run(args, cwd) {
  return spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8' });
}

function tmpProject(t) {
  const dir = mkdtempSync(path.join(tmpdir(), 'agents-rock-cli-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('installs solution-architect for both agents via flags', (t) => {
  const cwd = tmpProject(t);
  const res = run(['-p', 'solution-architect', '-a', 'claude', '-a', 'codex'], cwd);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(existsSync(path.join(cwd, '.agents/skills/arch-docs/SKILL.md')));
  assert.ok(lstatSync(path.join(cwd, '.claude/skills/arch-docs')).isSymbolicLink());
  assert.ok(lstatSync(path.join(cwd, '.codex/skills/arch-docs')).isSymbolicLink());
  assert.match(res.stdout, /arch-docs/);
});

test('uninstall for one agent keeps canonical, for all removes it', (t) => {
  const cwd = tmpProject(t);
  run(['-p', 'solution-architect', '-a', 'claude', '-a', 'codex'], cwd);
  let res = run(['uninstall', '-p', 'solution-architect', '-a', 'codex'], cwd);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(!existsSync(path.join(cwd, '.codex/skills/arch-docs')));
  assert.ok(existsSync(path.join(cwd, '.agents/skills/arch-docs')));
  res = run(['uninstall', '-p', 'solution-architect'], cwd);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(!existsSync(path.join(cwd, '.claude/skills/arch-docs')));
  assert.ok(!existsSync(path.join(cwd, '.agents/skills/arch-docs')));
});

test('unknown plugin errors with valid names listed', (t) => {
  const cwd = tmpProject(t);
  const res = run(['-p', 'nope', '-a', 'claude'], cwd);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /solution-architect/);
});

test('missing flags in non-TTY errors instead of hanging', (t) => {
  const cwd = tmpProject(t);
  const res = run([], cwd);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /TTY/);
});

test('collision without force exits 1 and reports skip', (t) => {
  const cwd = tmpProject(t);
  run(['-p', 'solution-architect', '-a', 'claude'], cwd);
  rmSync(path.join(cwd, '.claude/skills/arch-docs'));
  const mk = spawnSync('mkdir', ['-p', path.join(cwd, '.claude/skills/arch-docs')]);
  assert.equal(mk.status, 0);
  const res = run(['-p', 'solution-architect', '-a', 'claude'], cwd);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /force/);
});

test('read-only cwd prints a clean single-line error, no stack trace', (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'agents-rock-cli-ro-'));
  t.after(() => {
    chmodSync(dir, 0o755);
    rmSync(dir, { recursive: true, force: true });
  });
  chmodSync(dir, 0o555);
  const probe = path.join(dir, '.probe-write');
  try {
    writeFileSync(probe, 'x');
    unlinkSync(probe);
    t.skip('chmod does not block writes in this environment (likely root)');
    return;
  } catch {
    // expected: write blocked, proceed with the read-only assertions
  }
  const res = spawnSync(process.execPath, [BIN, '-p', 'solution-architect', '-a', 'claude'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, DEBUG: '' },
  });
  assert.equal(res.status, 1);
  const lines = res.stderr.trim().split('\n');
  assert.equal(lines.length, 1);
  assert.doesNotMatch(res.stderr, /\bat /);
});

test('--help and --version exit 0', (t) => {
  const cwd = tmpProject(t);
  assert.match(run(['--help'], cwd).stdout, /Usage: agents-rock/);
  assert.match(run(['--version'], cwd).stdout, /\d+\.\d+\.\d+/);
});
