import { existsSync } from 'node:fs';
import path from 'node:path';

const REPO_MARKERS = ['.git'];
const MANIFEST_MARKERS = ['package.json', 'pyproject.toml', 'go.mod', 'Cargo.toml'];

/**
 * Walk up from `cwd` looking for a project root. A repo marker anywhere up the
 * tree outranks a nearer manifest, so a monorepo package resolves to the repo.
 * Returns `{ root, marker }`, or null when nothing is found by `stopAt`.
 */
export function findProjectRoot(cwd, stopAt = path.parse(path.resolve(cwd)).root) {
  return search(cwd, stopAt, REPO_MARKERS) ?? search(cwd, stopAt, MANIFEST_MARKERS);
}

function search(cwd, stopAt, markers) {
  for (const dir of ancestors(cwd, stopAt)) {
    const marker = markers.find((name) => existsSync(path.join(dir, name)));
    if (marker) return { root: dir, marker };
  }
  return null;
}

function* ancestors(cwd, stopAt) {
  const boundary = path.resolve(stopAt);
  let dir = path.resolve(cwd);
  while (dir !== boundary) {
    yield dir;
    const parent = path.dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
  yield boundary;
}
