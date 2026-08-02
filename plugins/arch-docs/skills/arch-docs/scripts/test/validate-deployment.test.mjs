import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDeployment } from '../lib/validate-deployment.mjs';

const model = {
  elements: [
    { id: 'shop.api', kind: 'container', title: 'API' },
    { id: 'shop.web', kind: 'container', title: 'Web App' },
    { id: 'customer', kind: 'person', title: 'Customer' },
  ],
  deployed: ['shop.api'],
};

test('flags undeployed containers only', () => {
  const findings = validateDeployment({ model });
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /Web App/);
});

test('passes when every container is deployed', () => {
  const all = { ...model, deployed: ['shop.api', 'shop.web'] };
  assert.deepEqual(validateDeployment({ model: all }), []);
});
