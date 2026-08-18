import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { findProjectRoot } from '../src/cli/scope.mjs';

function tmpTree(t) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'agents-rock-scope-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function nested(root, ...segments) {
  const dir = path.join(root, ...segments);
  mkdirSync(dir, { recursive: true });
  return dir;
}

test('finds .git directory walking up from a nested subdir', (t) => {
  const root = tmpTree(t);
  const project = nested(root, 'myapp');
  mkdirSync(path.join(project, '.git'));
  const deep = nested(project, 'src', 'api', 'handlers');
  assert.deepEqual(findProjectRoot(deep, root), { root: project, marker: '.git' });
});

test('treats a .git file (worktree/submodule) as a root marker', (t) => {
  const root = tmpTree(t);
  const project = nested(root, 'myapp');
  writeFileSync(path.join(project, '.git'), 'gitdir: /elsewhere/.git/worktrees/myapp');
  assert.deepEqual(findProjectRoot(nested(project, 'src'), root), {
    root: project,
    marker: '.git',
  });
});

test('returns the starting dir when the marker lives there', (t) => {
  const root = tmpTree(t);
  const project = nested(root, 'myapp');
  mkdirSync(path.join(project, '.git'));
  assert.deepEqual(findProjectRoot(project, root), { root: project, marker: '.git' });
});

test('.git outranks a nearer manifest', (t) => {
  const root = tmpTree(t);
  const repo = nested(root, 'repo');
  mkdirSync(path.join(repo, '.git'));
  const pkg = nested(repo, 'packages', 'web');
  writeFileSync(path.join(pkg, 'package.json'), '{}');
  assert.deepEqual(findProjectRoot(nested(pkg, 'src'), root), { root: repo, marker: '.git' });
});

test('falls back to the nearest manifest when no .git exists', (t) => {
  const root = tmpTree(t);
  const outer = nested(root, 'outer');
  writeFileSync(path.join(outer, 'package.json'), '{}');
  const inner = nested(outer, 'inner');
  writeFileSync(path.join(inner, 'pyproject.toml'), '');
  assert.deepEqual(findProjectRoot(nested(inner, 'src'), root), {
    root: inner,
    marker: 'pyproject.toml',
  });
});

for (const marker of ['package.json', 'pyproject.toml', 'go.mod', 'Cargo.toml']) {
  test(`recognizes ${marker} as a manifest marker`, (t) => {
    const root = tmpTree(t);
    const project = nested(root, 'proj');
    writeFileSync(path.join(project, marker), '');
    assert.deepEqual(findProjectRoot(nested(project, 'sub'), root), { root: project, marker });
  });
}

test('returns null when no marker is found up to the boundary', (t) => {
  const root = tmpTree(t);
  assert.equal(findProjectRoot(nested(root, 'a', 'b', 'c'), root), null);
});

test('inspects the boundary dir itself but never above it', (t) => {
  const root = tmpTree(t);
  const above = nested(root, 'above');
  mkdirSync(path.join(above, '.git'));
  const boundary = nested(above, 'boundary');
  assert.equal(findProjectRoot(nested(boundary, 'deep'), boundary), null);
  writeFileSync(path.join(boundary, 'go.mod'), '');
  assert.deepEqual(findProjectRoot(nested(boundary, 'deep'), boundary), {
    root: boundary,
    marker: 'go.mod',
  });
});
