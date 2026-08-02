import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateClusters } from '../lib/validate-clusters.mjs';

const clusters = [
  { label: 'billing', cohesion: 0.8, top_nodes: ['src/billing/invoice.ts'] },
  { label: 'utils', cohesion: 0.2, top_nodes: ['src/utils/date.ts'] },
];
const rows = [{ name: 'Billing', keyPaths: ['src/billing'] }];

test('passes when clusters and components align', () => {
  assert.deepEqual(validateClusters({ clusters, componentRows: rows }), []);
});

test('fails high-cohesion cluster with no component', () => {
  const extra = [...clusters, { label: 'search', cohesion: 0.9, top_nodes: ['src/search/index.ts'] }];
  const findings = validateClusters({ clusters: extra, componentRows: rows });
  assert.match(findings[0].message, /search/);
});

test('fails component matching no cluster', () => {
  const rows2 = [...rows, { name: 'Ghost', keyPaths: ['src/ghost'] }];
  const findings = validateClusters({ clusters, componentRows: rows2 });
  assert.match(findings[0].message, /Ghost/);
});

test('ignores low-cohesion clusters', () => {
  const findings = validateClusters({ clusters, componentRows: rows, minCohesion: 0.5 });
  assert.deepEqual(findings.filter((f) => f.message.includes('utils')), []);
});
