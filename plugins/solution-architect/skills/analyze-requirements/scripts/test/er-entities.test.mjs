import { test } from 'node:test';
import assert from 'node:assert/strict';
import { erEntities } from '../lib/er-entities.mjs';

const MD = '```mermaid\nerDiagram\n  ORDER ||--o{ LINE_ITEM : contains\n  CUSTOMER {\n    string name\n  }\n```';

test('collects entities from relations and blocks', () => {
  assert.deepEqual(erEntities(MD).sort(), ['CUSTOMER', 'LINE_ITEM', 'ORDER']);
});

test('ignores non-er mermaid fences', () => {
  const md = '```mermaid\nflowchart TD\n  A --> B\n```';
  assert.deepEqual(erEntities(md), []);
});
