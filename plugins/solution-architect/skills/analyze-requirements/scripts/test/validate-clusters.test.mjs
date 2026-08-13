import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateClusters } from '../lib/validate-clusters.mjs';

// Real get_architecture clusters: top_nodes are bare symbol names, packages are
// the top-level folders that bind the cluster. Key paths are file paths — the
// match runs paths against packages, never against symbol names.
const clusters = [
  { label: 'backend', cohesion: 0.83, top_nodes: ['createBooking', 'save', 'emit'], packages: ['backend'] },
  { label: 'frontend', cohesion: 0.2, top_nodes: ['HomePage'], packages: ['frontend'] },
];
const rows = [{ name: 'API', keyPaths: ['backend/src/services'] }];

test('matches file-path key paths against cluster packages', () => {
  assert.deepEqual(validateClusters({ clusters, componentRows: rows }), []);
});

test('fails high-cohesion cluster with no component row', () => {
  const extra = [...clusters, { label: 'worker', cohesion: 0.9, top_nodes: ['processJob'], packages: ['worker'] }];
  const findings = validateClusters({ clusters: extra, componentRows: rows });
  assert.match(findings[0].message, /worker/);
});

test('fails component whose key paths land in no cluster package', () => {
  const rows2 = [...rows, { name: 'Ghost', keyPaths: ['ghost/src'] }];
  const findings = validateClusters({ clusters, componentRows: rows2 });
  assert.match(findings[0].message, /Ghost/);
});

test('ignores low-cohesion clusters', () => {
  const findings = validateClusters({ clusters, componentRows: rows, minCohesion: 0.5 });
  assert.deepEqual(findings.filter((f) => f.message.includes('frontend')), []);
});

test('a package name alone is a valid key path, and prefixes do not false-match', () => {
  const rows2 = [{ name: 'API', keyPaths: ['backend'] }, { name: 'Web', keyPaths: ['front'] }];
  const findings = validateClusters({ clusters, componentRows: rows2 });
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /Web/);
});

test('datastore rows named in the Data Stores section are exempt', () => {
  const rows2 = [...rows, { name: 'MongoDB', keyPaths: ['—'] }];
  const findings = validateClusters({ clusters, componentRows: rows2, storeNames: ['mongodb'] });
  assert.deepEqual(findings, []);
});
