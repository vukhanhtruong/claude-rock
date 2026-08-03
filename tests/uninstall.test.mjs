import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { installPlugin } from '../src/cli/install.mjs';
import { uninstallPlugin } from '../src/cli/uninstall.mjs';
import { agentSkillsDir, canonicalSkillsDir } from '../src/cli/agents.mjs';

function makePlugin(root) {
  const dir = path.join(root, 'bundle', 'demo');
  mkdirSync(path.join(dir, 'skills', 'demo'), { recursive: true });
  writeFileSync(path.join(dir, 'skills', 'demo', 'SKILL.md'), '# demo');
  return dir;
}

function setup(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'agents-rock-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const cwd = path.join(root, 'project');
  mkdirSync(cwd, { recursive: true });
  return { pluginDir: makePlugin(root), cwd };
}

test('uninstalling last agent removes canonical too', (t) => {
  const { pluginDir, cwd } = setup(t);
  installPlugin({ pluginDir, cwd, agents: ['claude'] });
  const result = uninstallPlugin({ pluginDir, cwd, agents: ['claude'] });
  assert.deepEqual(result.removed, [{ skill: 'demo', agent: 'claude' }]);
  assert.deepEqual(result.canonicalRemoved, ['demo']);
  assert.ok(!existsSync(path.join(agentSkillsDir('claude', cwd), 'demo')));
  assert.ok(!existsSync(path.join(canonicalSkillsDir(cwd), 'demo')));
});

test('canonical kept while another agent still references skill', (t) => {
  const { pluginDir, cwd } = setup(t);
  installPlugin({ pluginDir, cwd, agents: ['claude', 'codex'] });
  const result = uninstallPlugin({ pluginDir, cwd, agents: ['codex'] });
  assert.deepEqual(result.canonicalRemoved, []);
  assert.ok(existsSync(path.join(canonicalSkillsDir(cwd), 'demo')));
  assert.ok(existsSync(path.join(agentSkillsDir('claude', cwd), 'demo')));
});

test('non-symlink at agent path skipped without force', (t) => {
  const { pluginDir, cwd } = setup(t);
  const realDir = path.join(agentSkillsDir('claude', cwd), 'demo');
  mkdirSync(realDir, { recursive: true });
  const result = uninstallPlugin({ pluginDir, cwd, agents: ['claude'] });
  assert.equal(result.skipped.length, 1);
  assert.ok(existsSync(realDir));
});

test('non-symlink removed with force', (t) => {
  const { pluginDir, cwd } = setup(t);
  const realDir = path.join(agentSkillsDir('claude', cwd), 'demo');
  mkdirSync(realDir, { recursive: true });
  const result = uninstallPlugin({ pluginDir, cwd, agents: ['claude'], force: true });
  assert.equal(result.skipped.length, 0);
  assert.ok(!existsSync(realDir));
});

test('uninstalling when nothing installed is a silent no-op', (t) => {
  const { pluginDir, cwd } = setup(t);
  const result = uninstallPlugin({ pluginDir, cwd, agents: ['claude', 'codex'] });
  assert.deepEqual(result, { removed: [], canonicalRemoved: [], skipped: [] });
});
