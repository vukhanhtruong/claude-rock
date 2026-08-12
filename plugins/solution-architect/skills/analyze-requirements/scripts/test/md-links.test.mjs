import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractLinks } from '../lib/md-links.mjs';

test('extracts links from prose and table cells', () => {
  const md = 'See [ADR-7](docs/adr/0007-gate.md) and | [api](ARCHITECTURE.md#core-components) |';
  const links = extractLinks(md);
  assert.deepEqual(links, [
    { text: 'ADR-7', href: 'docs/adr/0007-gate.md' },
    { text: 'api', href: 'ARCHITECTURE.md#core-components' },
  ]);
});

test('returns empty array when no links', () => {
  assert.deepEqual(extractLinks('plain text'), []);
});
