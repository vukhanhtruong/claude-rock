import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractModel } from '../lib/likec4-extract.mjs';

const raw = JSON.parse(readFileSync(new URL('./fixtures/sample-model.json', import.meta.url), 'utf8'));

test('extracts elements with kind and title', () => {
  const model = extractModel(raw);
  const api = model.elements.find((e) => e.id === 'shop.api');
  assert.equal(api.kind, 'container');
  assert.equal(api.title, 'API');
});

test('collects deployed element ids from instanceOf', () => {
  const model = extractModel(raw);
  assert.ok(model.deployed.includes('shop.api'));
  assert.ok(!model.deployed.includes('shop.web'));
});

test('normalizes #external tag to kind external', () => {
  const model = extractModel(raw);
  const stripe = model.elements.find((e) => e.title === 'Stripe');
  assert.equal(stripe.kind, 'external');
});
