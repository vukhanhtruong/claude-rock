import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadRegistry, listSkills } from '../src/cli/registry.mjs';

function makeFixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'agents-rock-'));
  const plugins = path.join(root, 'plugins');
  const mk = (name, meta) => {
    const dir = path.join(plugins, name);
    mkdirSync(path.join(dir, '.claude-plugin'), { recursive: true });
    writeFileSync(path.join(dir, '.claude-plugin', 'plugin.json'), JSON.stringify(meta));
    mkdirSync(path.join(dir, 'skills', name, 'assets'), { recursive: true });
    writeFileSync(path.join(dir, 'skills', name, 'SKILL.md'), `# ${name}`);
    return dir;
  };
  mk('beta-plugin', { name: 'beta-plugin', description: 'B', version: '2.0.0' });
  mk('alpha-plugin', { name: 'alpha-plugin', description: 'A', version: '1.0.0' });
  mkdirSync(path.join(plugins, 'not-a-plugin'));
  return { root, plugins };
}

test('loadRegistry returns plugins sorted by name, skipping non-plugins', (t) => {
  const { root, plugins } = makeFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const reg = loadRegistry(plugins);
  assert.deepEqual(reg.map((p) => p.name), ['alpha-plugin', 'beta-plugin']);
  assert.equal(reg[0].description, 'A');
  assert.equal(reg[0].version, '1.0.0');
  assert.ok(reg[0].dir.endsWith(path.join('plugins', 'alpha-plugin')));
});

test('loadRegistry returns [] for missing dir', () => {
  assert.deepEqual(loadRegistry('/nonexistent/nowhere'), []);
});

test('listSkills lists skill dirs', (t) => {
  const { root, plugins } = makeFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const skills = listSkills(path.join(plugins, 'alpha-plugin'));
  assert.deepEqual(skills.map((s) => s.name), ['alpha-plugin']);
});

test('listSkills returns [] when no skills dir', (t) => {
  const { root, plugins } = makeFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.deepEqual(listSkills(path.join(plugins, 'not-a-plugin')), []);
});
