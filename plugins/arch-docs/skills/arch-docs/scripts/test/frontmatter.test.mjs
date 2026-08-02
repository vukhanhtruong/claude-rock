import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

test('parses simple key: value pairs', () => {
  const md = '---\nname: shop\nmode: brownfield\n---\n# Doc';
  const { data } = parseFrontmatter(md);
  assert.deepEqual(data, { name: 'shop', mode: 'brownfield' });
});

test('parses JSON values for electedDocs', () => {
  const md = '---\nelectedDocs: [{"name":"threat-model","elected":false,"reason":"CLI tool"}]\n---';
  const { data } = parseFrontmatter(md);
  assert.equal(data.electedDocs[0].reason, 'CLI tool');
});

test('returns error when no frontmatter block', () => {
  const { data, error } = parseFrontmatter('# Just a doc');
  assert.equal(data, null);
  assert.match(error, /no frontmatter/);
});

test('returns error for a malformed line', () => {
  const { data, error } = parseFrontmatter('---\nnot a pair\n---');
  assert.equal(data, null);
  assert.match(error, /bad line/);
});
