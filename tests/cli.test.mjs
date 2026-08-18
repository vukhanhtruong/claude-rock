import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, rmSync, lstatSync, existsSync,
  chmodSync, writeFileSync, unlinkSync, realpathSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/agents-rock.mjs', import.meta.url));
const SKILL = 'analyze-requirements';

function run(args, cwd, env = {}) {
  return spawnSync(process.execPath, [BIN, ...args], {
    cwd, encoding: 'utf8', env: { ...process.env, ...env },
  });
}

function tmpProject(t) {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'agents-rock-cli-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('installs solution-architect for both agents via flags', (t) => {
  const cwd = tmpProject(t);
  const res = run(['-p', 'solution-architect', '-a', 'claude', '-a', 'codex', '--project'], cwd);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(existsSync(path.join(cwd, '.agents/skills', SKILL, 'SKILL.md')));
  assert.ok(lstatSync(path.join(cwd, '.claude/skills', SKILL)).isSymbolicLink());
  assert.ok(lstatSync(path.join(cwd, '.codex/skills', SKILL)).isSymbolicLink());
  assert.match(res.stdout, new RegExp(SKILL));
});

test('--project installs into the detected repo root, not the cwd', (t) => {
  const cwd = tmpProject(t);
  mkdirSync(path.join(cwd, '.git'));
  const deep = path.join(cwd, 'packages', 'web', 'src');
  mkdirSync(deep, { recursive: true });
  const res = run(['-p', 'lmk', '-a', 'claude', '--project'], deep);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(existsSync(path.join(cwd, '.agents/skills/lmk/SKILL.md')));
  assert.ok(!existsSync(path.join(deep, '.agents')));
});

test('--dir installs into the given directory', (t) => {
  const cwd = tmpProject(t);
  const target = path.join(cwd, 'target');
  mkdirSync(target);
  const res = run(['-p', 'lmk', '-a', 'claude', '--dir', target], cwd);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(existsSync(path.join(target, '.agents/skills/lmk/SKILL.md')));
  assert.ok(!existsSync(path.join(cwd, '.agents')));
});

test('--global installs under the home dir, not the cwd', (t) => {
  const cwd = tmpProject(t);
  const home = tmpProject(t);
  const res = run(['-p', 'lmk', '-a', 'claude', '-a', 'codex', '--global'], cwd, { HOME: home });
  assert.equal(res.status, 0, res.stderr);
  assert.ok(existsSync(path.join(home, '.agents/skills/lmk/SKILL.md')));
  assert.ok(lstatSync(path.join(home, '.claude/skills/lmk')).isSymbolicLink());
  assert.ok(lstatSync(path.join(home, '.codex/skills/lmk')).isSymbolicLink());
  assert.ok(!existsSync(path.join(cwd, '.agents')));
});

test('--global honors CLAUDE_CONFIG_DIR and CODEX_HOME', (t) => {
  const cwd = tmpProject(t);
  const home = tmpProject(t);
  const res = run(['-p', 'lmk', '-a', 'claude', '-a', 'codex', '--global'], cwd, {
    HOME: home,
    CLAUDE_CONFIG_DIR: path.join(home, 'cfg-claude'),
    CODEX_HOME: path.join(home, 'cfg-codex'),
  });
  assert.equal(res.status, 0, res.stderr);
  assert.ok(lstatSync(path.join(home, 'cfg-claude/skills/lmk')).isSymbolicLink());
  assert.ok(lstatSync(path.join(home, 'cfg-codex/skills/lmk')).isSymbolicLink());
  assert.ok(!existsSync(path.join(home, '.claude')));
});

test('--global uninstall removes the home install', (t) => {
  const cwd = tmpProject(t);
  const home = tmpProject(t);
  run(['-p', 'lmk', '-a', 'claude', '--global'], cwd, { HOME: home });
  const res = run(['uninstall', '-p', 'lmk', '--global'], cwd, { HOME: home });
  assert.equal(res.status, 0, res.stderr);
  assert.ok(!existsSync(path.join(home, '.claude/skills/lmk')));
  assert.ok(!existsSync(path.join(home, '.agents/skills/lmk')));
});

test('uninstall for one agent keeps canonical, for all removes it', (t) => {
  const cwd = tmpProject(t);
  run(['-p', 'solution-architect', '-a', 'claude', '-a', 'codex', '--project'], cwd);
  let res = run(['uninstall', '-p', 'solution-architect', '-a', 'codex', '--project'], cwd);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(!existsSync(path.join(cwd, '.codex/skills', SKILL)));
  assert.ok(existsSync(path.join(cwd, '.agents/skills', SKILL)));
  res = run(['uninstall', '-p', 'solution-architect', '--project'], cwd);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(!existsSync(path.join(cwd, '.claude/skills', SKILL)));
  assert.ok(!existsSync(path.join(cwd, '.agents/skills', SKILL)));
});

test('unknown plugin errors with valid names listed', (t) => {
  const cwd = tmpProject(t);
  const res = run(['-p', 'nope', '-a', 'claude', '--project'], cwd);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /solution-architect/);
});

test('missing --plugin in non-TTY errors instead of hanging', (t) => {
  const cwd = tmpProject(t);
  const res = run([], cwd);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /--plugin/);
});

test('missing scope in non-TTY names --global and --project', (t) => {
  const cwd = tmpProject(t);
  const res = run(['-p', 'lmk', '-a', 'claude'], cwd);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /--global/);
  assert.match(res.stderr, /--project/);
  assert.ok(!existsSync(path.join(cwd, '.agents')), 'nothing written before the error');
});

test('collision without force exits 1 and reports skip', (t) => {
  const cwd = tmpProject(t);
  run(['-p', 'solution-architect', '-a', 'claude', '--project'], cwd);
  rmSync(path.join(cwd, '.claude/skills', SKILL));
  mkdirSync(path.join(cwd, '.claude/skills', SKILL), { recursive: true });
  const res = run(['-p', 'solution-architect', '-a', 'claude', '--project'], cwd);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /force/);
});

test('read-only target prints a clean single-line error, no stack trace', (t) => {
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
  const res = run(['-p', 'solution-architect', '-a', 'claude', '--dir', dir], dir, { DEBUG: '' });
  assert.equal(res.status, 1);
  assert.equal(res.stderr.trim().split('\n').length, 1);
  assert.doesNotMatch(res.stderr, /\bat /);
});

test('--help documents scope flags, --version prints a semver', (t) => {
  const cwd = tmpProject(t);
  const help = run(['--help'], cwd).stdout;
  assert.match(help, /Usage: agents-rock/);
  assert.match(help, /--global/);
  assert.match(help, /--project/);
  assert.match(help, /--dir/);
  assert.match(help, /--yes/);
  assert.match(run(['--version'], cwd).stdout, /\d+\.\d+\.\d+/);
});
