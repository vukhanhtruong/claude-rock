import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectIds, checkDuplicates, checkRefs, checkLabels, checkAmbiguity, checkReadiness } from '../lib/checks.mjs';

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

test('the pass fixture has no ambiguity or readiness findings', () => {
  const pkg = load();
  assert.deepEqual([...checkAmbiguity(pkg), ...checkReadiness(pkg)], []);
});

test('a vague requirement is flagged with its id and the term', () => {
  const pkg = load();
  pkg.requirements[0].text = 'The system must be fast and user-friendly.';
  const findings = checkAmbiguity(pkg);
  assert.ok(findings.some((f) => f.includes('FR-001') && f.includes('"fast"')));
  assert.ok(findings.some((f) => f.includes('FR-001') && f.includes('"user-friendly"')));
});

test('a vague nfr is flagged', () => {
  const pkg = load();
  pkg.nfrs[0].text = 'The system should be robust.';
  assert.ok(checkAmbiguity(pkg).some((f) => f.includes('NFR-001') && f.includes('"robust"')));
});

test('a hand-edited readiness overall is refused', () => {
  const pkg = load();
  pkg.readiness.overall = 95;
  assert.ok(checkReadiness(pkg).some((f) => f.includes('recomputed')));
});

test('a missing area score is refused', () => {
  const pkg = load();
  delete pkg.readiness.areas.data;
  assert.ok(checkReadiness(pkg).some((f) => f.includes('missing area score')));
});

test('status past ANALYZED with an open architecture blocker is refused', () => {
  const pkg = load();
  pkg.status = 'VALIDATED';
  assert.ok(checkReadiness(pkg).some((f) => f.includes('VALIDATED') && f.includes('Q-001')));
});

test('an open architecture blocker missing from readiness.blockers is refused', () => {
  const pkg = load();
  pkg.readiness.blockers = ['ASM-001'];
  assert.ok(checkReadiness(pkg).some((f) => f.includes('blockers missing') && f.includes('Q-001')));
});

test('READY with an unconfirmed high-impact assumption is refused', () => {
  const pkg = load();
  pkg.status = 'READY_FOR_ARCHITECTURE';
  assert.ok(checkReadiness(pkg).some((f) => f.includes('high-impact assumptions') && f.includes('ASM-001')));
});

test('READY with an open conflict is refused', () => {
  const pkg = load();
  pkg.status = 'READY_FOR_ARCHITECTURE';
  pkg.conflicts.push({ id: 'CONFLICT-001', topic: 'approval', statements: ['A: all', 'B: under $1,000 auto'], status: 'open' });
  assert.ok(checkReadiness(pkg).some((f) => f.includes('open conflicts')));
});
