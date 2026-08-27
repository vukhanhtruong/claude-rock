import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectIds, checkDuplicates, checkRefs, checkLabels } from '../lib/checks.mjs';

const load = () =>
  JSON.parse(readFileSync(new URL('./fixtures/requirements-pass.json', import.meta.url), 'utf8'));

test('the pass fixture has no integrity findings', () => {
  const pkg = load();
  const ids = collectIds(pkg);
  assert.deepEqual(
    [...checkDuplicates(pkg), ...checkRefs(pkg, ids), ...checkLabels(pkg)], []);
});

test('a duplicate id is refused', () => {
  const pkg = load();
  pkg.assumptions.push({ ...pkg.assumptions[0] });
  assert.ok(checkDuplicates(pkg).some((f) => f.includes('duplicate id: ASM-001')));
});

test('a dangling trace reference is refused', () => {
  const pkg = load();
  pkg.requirements[0].traces.rules = ['BR-999'];
  assert.ok(checkRefs(pkg, collectIds(pkg)).some((f) => f.includes('FR-001') && f.includes('BR-999')));
});

test('a dangling readiness blocker is refused', () => {
  const pkg = load();
  pkg.readiness.blockers.push('Q-404');
  assert.ok(checkRefs(pkg, collectIds(pkg)).some((f) => f.includes('Q-404')));
});

test('a requirement without a label is refused', () => {
  const pkg = load();
  delete pkg.requirements[1].label;
  assert.ok(checkLabels(pkg).some((f) => f.includes('FR-002') && f.includes('missing label')));
});

test('a business rule without a source is refused', () => {
  const pkg = load();
  delete pkg.businessRules[0].source;
  assert.ok(checkLabels(pkg).some((f) => f.includes('BR-001') && f.includes('missing source')));
});

test('a recommended requirement in scope "in" needs a paired open question', () => {
  const pkg = load();
  pkg.requirements[1].label = 'recommended';
  assert.ok(checkLabels(pkg).some((f) => f.includes('FR-002') && f.includes('open question')));
});
