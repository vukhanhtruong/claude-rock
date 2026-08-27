import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkSchema } from '../lib/schema.mjs';

const load = () =>
  JSON.parse(readFileSync(new URL('./fixtures/requirements-pass.json', import.meta.url), 'utf8'));

test('the pass fixture has no schema findings', () => {
  assert.deepEqual(checkSchema(load()), []);
});

test('a missing top-level field is named', () => {
  const pkg = load();
  delete pkg.readiness;
  assert.ok(checkSchema(pkg).some((f) => f.includes('readiness')));
});

test('an illegal status is refused', () => {
  const pkg = load();
  pkg.status = 'FINISHED';
  assert.ok(checkSchema(pkg).some((f) => f.includes('illegal status')));
});

test('a bad id format is refused', () => {
  const pkg = load();
  pkg.requirements[0].id = 'REQ-1';
  assert.ok(checkSchema(pkg).some((f) => f.includes('bad id REQ-1')));
});

test('a bad goal id format is refused', () => {
  const pkg = load();
  pkg.context.goals[0].id = 'GOAL-1';
  assert.ok(checkSchema(pkg).some((f) => f.includes('bad id GOAL-1')));
});

test('an illegal row enum is refused', () => {
  const pkg = load();
  pkg.requirements[0].label = 'definite';
  assert.ok(checkSchema(pkg).some((f) => f.includes('illegal label')));
});
