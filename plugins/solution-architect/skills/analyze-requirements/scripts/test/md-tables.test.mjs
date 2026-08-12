import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTables } from '../lib/md-tables.mjs';

const MD = `## Core Components

| Component | Responsibility | src |
|---|---|---|
| api | serves REST | observed |
| worker | queue jobs | stated |

## External Integrations

| System | Method | src |
|---|---|---|
| stripe | REST | researched [1] |
`;

test('parses tables with section, headers, rows', () => {
  const tables = parseTables(MD);
  assert.equal(tables.length, 2);
  assert.equal(tables[0].section, 'Core Components');
  assert.deepEqual(tables[0].headers, ['Component', 'Responsibility', 'src']);
  assert.deepEqual(tables[0].rows[1], ['worker', 'queue jobs', 'stated']);
  assert.equal(tables[1].section, 'External Integrations');
});

test('returns empty array when no tables', () => {
  assert.deepEqual(parseTables('# Title\nprose only'), []);
});
