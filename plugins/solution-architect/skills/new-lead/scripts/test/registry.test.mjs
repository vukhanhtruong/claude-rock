// scripts/test/registry.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistry } from '../lib/registry.mjs';

const lead = (over = {}) => ({
  id: 'acme-crm', client: 'Acme', title: 'CRM rebuild', status: 'active',
  created: '2026-08-07', closed: null, value: null, scenario: null, ...over,
});
const reg = (leads) => ({ version: 1, leads });

test('valid registry -> no findings', () => {
  assert.deepEqual(validateRegistry(reg([lead()])), []);
});
test('wrong version flagged', () => {
  assert.match(validateRegistry({ version: 2, leads: [] })[0], /version/);
});
test('non-array leads flagged', () => {
  assert.match(validateRegistry({ version: 1, leads: {} })[0], /array/);
});
test('bad id, bad status, duplicate id flagged', () => {
  const findings = validateRegistry(reg([
    lead({ id: 'Bad_ID' }), lead({ status: 'open' }), lead({}),
  ]));
  assert.equal(findings.filter(f => /kebab-case/.test(f)).length, 1);
  assert.equal(findings.filter(f => /status/.test(f)).length, 1);
  assert.equal(findings.filter(f => /duplicate/.test(f)).length, 1);
});
test('closed must be null while active, date once won', () => {
  assert.match(validateRegistry(reg([lead({ closed: '2026-08-08' })]))[0], /closed/);
  assert.match(validateRegistry(reg([lead({ status: 'won' })]))[0], /closed/);
  assert.deepEqual(validateRegistry(reg([lead({ status: 'won', closed: '2026-08-08' })])), []);
});
test('client and title are required — the dashboard search reads both unguarded', () => {
  const findings = validateRegistry(reg([lead({ client: undefined, title: undefined })]));
  assert.equal(findings.filter(f => /client/.test(f)).length, 1);
  assert.equal(findings.filter(f => /title/.test(f)).length, 1);
  assert.match(validateRegistry(reg([lead({ title: null })]))[0], /title/);
  assert.match(validateRegistry(reg([lead({ client: '' })]))[0], /client/);
});
test('value shape checked', () => {
  assert.match(validateRegistry(reg([lead({ value: { low: 5 } })]))[0], /value/);
  assert.deepEqual(validateRegistry(reg([lead({ value: { low: 1, high: 2, currency: 'USD' } })])), []);
  assert.match(validateRegistry(reg([lead({ value: { low: 9, high: 2, currency: 'USD' } })]))[0], /value/);
});
