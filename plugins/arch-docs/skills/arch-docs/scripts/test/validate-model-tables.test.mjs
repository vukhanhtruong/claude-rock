import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateModelTables } from '../lib/validate-model-tables.mjs';

const model = {
  elements: [
    { id: 'shop.api', kind: 'container', title: 'API' },
    { id: 'shop.web', kind: 'container', title: 'Web App' },
    { id: 'stripe', kind: 'external', title: 'Stripe' },
  ],
  deployed: ['shop.api'],
};
const components = { section: 'Core Components', headers: ['Component', 'src'],
  rows: [['[API](#x)', 'observed'], ['Web App', 'observed']] };
const externals = { section: 'External Integrations', headers: ['System', 'src'],
  rows: [['Stripe', 'researched [docs]']] };
const stores = { section: 'Data Stores', headers: ['Store', 'src'], rows: [['orders', 'observed']] };

test('passes when model and tables agree', () => {
  const findings = validateModelTables({
    model, tables: [components, externals, stores], erNames: ['orders'],
  });
  assert.deepEqual(findings, []);
});

test('fails component in table but not in model', () => {
  const extra = { ...components, rows: [...components.rows, ['Ghost', 'proposed']] };
  const findings = validateModelTables({ model, tables: [extra, externals, stores], erNames: ['orders'] });
  assert.match(findings[0].message, /Ghost.*not in model/i);
});

test('fails container in model but missing from table', () => {
  const thin = { ...components, rows: [components.rows[0]] };
  const findings = validateModelTables({ model, tables: [thin, externals, stores], erNames: ['orders'] });
  assert.match(findings[0].message, /Web App.*no table row/i);
});

test('fails store without ER entity and vice versa', () => {
  const findings = validateModelTables({
    model, tables: [components, externals, stores], erNames: ['payments'],
  });
  assert.equal(findings.length, 2);
});

test('real fixture: Stripe detected as external end-to-end', async () => {
  const { readFileSync } = await import('node:fs');
  const { extractModel } = await import('../lib/likec4-extract.mjs');
  const raw = JSON.parse(readFileSync(new URL('./fixtures/sample-model.json', import.meta.url), 'utf8'));
  const real = extractModel(raw);
  assert.ok(real.elements.some((e) => e.kind === 'external' && e.title === 'Stripe'));
});
