#!/usr/bin/env node
// Prints (space-joined) the names of plugins whose plugin.json "version"
// changed between two git revs. Used by .github/workflows/publish.yml to
// gate npm publishing.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const MANIFEST = /^plugins\/([^/]+)\/\.claude-plugin\/plugin\.json$/;

export function changedVersions(pairs) {
  return pairs
    .filter(({ before, after }) => after !== null && versionOf(before) !== versionOf(after))
    .map(({ name }) => name);
}

function versionOf(text) {
  return text === null ? null : JSON.parse(text).version;
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function fileAt(rev, file) {
  try {
    return git('show', `${rev}:${file}`);
  } catch {
    return null;
  }
}

// The before-rev is all zeros on a force push or branch creation.
function resolveRev(rev) {
  try {
    git('cat-file', '-e', rev);
    return rev;
  } catch {
    return 'HEAD^';
  }
}

function changedManifests(beforeRev, afterRev) {
  return git('diff', '--name-only', beforeRev, afterRev, '--', 'plugins/')
    .split('\n')
    .map((file) => MANIFEST.exec(file))
    .filter(Boolean);
}

function main([beforeArg, afterRev]) {
  if (!beforeArg || !afterRev) {
    console.error('usage: changed-versions.mjs <before-rev> <after-rev>');
    return 1;
  }
  const beforeRev = resolveRev(beforeArg);
  const pairs = changedManifests(beforeRev, afterRev).map(([file, name]) => ({
    name,
    before: fileAt(beforeRev, file),
    after: fileAt(afterRev, file),
  }));
  console.log(changedVersions(pairs).join(' '));
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
