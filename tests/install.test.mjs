import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, lstatSync, readlinkSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { installPlugin } from '../src/cli/install.mjs';
import { agentSkillsDir, canonicalSkillsDir } from '../src/cli/agents.mjs';

function makePlugin(root) {
  const dir = path.join(root, 'bundle', 'demo');
  mkdirSync(path.join(dir, 'skills', 'demo', 'assets'), { recursive: true });
  writeFileSync(path.join(dir, 'skills', 'demo', 'SKILL.md'), '# demo v1');
  writeFileSync(path.join(dir, 'skills', 'demo', 'assets', 'a.txt'), 'asset');
  return dir;
}

function setup(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'agents-rock-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const cwd = path.join(root, 'project');
  mkdirSync(cwd, { recursive: true });
  return { pluginDir: makePlugin(root), cwd };
}

test('installs canonical copy plus relative symlinks per agent', (t) => {
  const { pluginDir, cwd } = setup(t);
  const result = installPlugin({ pluginDir, cwd, agents: ['claude', 'codex'] });
  const canonical = path.join(canonicalSkillsDir(cwd), 'demo');
  assert.equal(readFileSync(path.join(canonical, 'SKILL.md'), 'utf8'), '# demo v1');
  for (const agent of ['claude', 'codex']) {
    const link = path.join(agentSkillsDir(agent, cwd), 'demo');
    assert.ok(lstatSync(link).isSymbolicLink());
    assert.equal(readlinkSync(link), path.join('..', '..', '.agents', 'skills', 'demo'));
  }
  assert.equal(result.installed.length, 2);
  assert.equal(result.skipped.length, 0);
});

test('re-install is idempotent (mode linked, nothing skipped)', (t) => {
  const { pluginDir, cwd } = setup(t);
  installPlugin({ pluginDir, cwd, agents: ['claude'] });
  const result = installPlugin({ pluginDir, cwd, agents: ['claude'] });
  assert.deepEqual(result.installed.map((i) => i.mode), ['linked']);
  assert.equal(result.reused.length, 1);
  assert.equal(result.skipped.length, 0);
});

test('adding a second agent reuses existing canonical', (t) => {
  const { pluginDir, cwd } = setup(t);
  installPlugin({ pluginDir, cwd, agents: ['claude'] });
  const result = installPlugin({ pluginDir, cwd, agents: ['codex'] });
  assert.equal(result.installed[0].agent, 'codex');
  assert.equal(result.reused.length, 1);
});

test('real dir at agent path is skipped without force', (t) => {
  const { pluginDir, cwd } = setup(t);
  const blocker = path.join(agentSkillsDir('claude', cwd), 'demo');
  mkdirSync(blocker, { recursive: true });
  const result = installPlugin({ pluginDir, cwd, agents: ['claude'] });
  assert.equal(result.skipped.length, 1);
  assert.ok(!lstatSync(blocker).isSymbolicLink());
});

test('force replaces blocker and stale canonical', (t) => {
  const { pluginDir, cwd } = setup(t);
  const blocker = path.join(agentSkillsDir('claude', cwd), 'demo');
  mkdirSync(blocker, { recursive: true });
  const canonical = path.join(canonicalSkillsDir(cwd), 'demo');
  mkdirSync(canonical, { recursive: true });
  writeFileSync(path.join(canonical, 'SKILL.md'), 'stale');
  const result = installPlugin({ pluginDir, cwd, agents: ['claude'], force: true });
  assert.equal(result.skipped.length, 0);
  assert.equal(readFileSync(path.join(canonical, 'SKILL.md'), 'utf8'), '# demo v1');
  assert.ok(lstatSync(blocker).isSymbolicLink());
});
