import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changedVersions } from '../src/ci/changed-versions.mjs';

const json = (version) => JSON.stringify({ name: 'x', version, description: 'd' });

test('version bump is reported', () => {
  const pairs = [{ name: 'solution-architect', before: json('1.0.0'), after: json('1.1.0') }];
  assert.deepEqual(changedVersions(pairs), ['solution-architect']);
});

test('non-version edit is ignored', () => {
  const before = JSON.stringify({ name: 'x', version: '1.0.0', description: 'old' });
  const after = JSON.stringify({ name: 'x', version: '1.0.0', description: 'new' });
  assert.deepEqual(changedVersions([{ name: 'p', before, after }]), []);
});

test('new plugin counts as changed', () => {
  assert.deepEqual(changedVersions([{ name: 'p', before: null, after: json('1.0.0') }]), ['p']);
});

test('deleted plugin is ignored', () => {
  assert.deepEqual(changedVersions([{ name: 'p', before: json('1.0.0'), after: null }]), []);
});

test('unchanged version yields empty list', () => {
  assert.deepEqual(changedVersions([{ name: 'p', before: json('2.0.0'), after: json('2.0.0') }]), []);
});
