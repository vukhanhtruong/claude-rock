import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLinks, slugify } from '../lib/validate-links.mjs';

const files = ['ARCHITECTURE.md', 'docs/adr/0007-gate.md'];
const anchors = { 'ARCHITECTURE.md': ['core-components', 'security'] };

test('slugify matches github style', () => {
  assert.equal(slugify('Core Components'), 'core-components');
  assert.equal(slugify('Quality Requirements & SLOs'), 'quality-requirements--slos');
});

test('passes valid file, anchor, and external links', () => {
  const links = [
    { fromDoc: 'DOMAIN-OVERVIEW.md', href: 'docs/adr/0007-gate.md' },
    { fromDoc: 'DOMAIN-OVERVIEW.md', href: 'ARCHITECTURE.md#core-components' },
    { fromDoc: 'ARCHITECTURE.md', href: '#security' },
    { fromDoc: 'ARCHITECTURE.md', href: 'https://likec4.dev/' },
  ];
  assert.deepEqual(validateLinks({ links, files, anchors }), []);
});

test('resolves relative links against the linking doc directory', () => {
  const links = [
    { fromDoc: 'docs/DOMAIN-OVERVIEW.md', href: 'adr/0007-gate.md' },
    { fromDoc: 'docs/DOMAIN-OVERVIEW.md', href: '../ARCHITECTURE.md#core-components' },
  ];
  assert.deepEqual(validateLinks({ links, files, anchors }), []);
});

test('fails missing file and missing anchor', () => {
  const links = [
    { fromDoc: 'A.md', href: 'docs/adr/0099-none.md' },
    { fromDoc: 'A.md', href: 'ARCHITECTURE.md#nope' },
  ];
  const findings = validateLinks({ links, files, anchors });
  assert.equal(findings.length, 2);
});
