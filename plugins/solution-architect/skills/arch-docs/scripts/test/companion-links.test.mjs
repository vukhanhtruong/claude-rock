import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { estimateLink } from '../lib/companion-links.mjs';

function tree() {
  const root = mkdtempSync(join(tmpdir(), 'companion-links-'));
  const docs = join(root, 'docs');
  const out = join(root, 'viewer');
  mkdirSync(docs);
  mkdirSync(out);
  return { docs, out };
}

test('estimation page links a sibling estimate.html, relative to the out dir', () => {
  const { docs, out } = tree();
  writeFileSync(join(docs, 'estimate.html'), '<!doctype html>');
  const page = { kind: 'estimation', path: join(docs, 'estimation.md') };
  const link = estimateLink(page, out);
  assert.match(link, /<a href="\.\.\/docs\/estimate\.html">/);
  assert.match(link, /interactive/i);
});

// The viewer folder is the handover unit: when estimate.html is rendered into
// it, the link must stay inside the folder so shipping viewer/ alone works.
test('an estimate.html inside the viewer folder wins over the sibling', () => {
  const { docs, out } = tree();
  writeFileSync(join(docs, 'estimate.html'), '<!doctype html>');
  writeFileSync(join(out, 'estimate.html'), '<!doctype html>');
  const page = { kind: 'estimation', path: join(docs, 'estimation.md') };
  assert.match(estimateLink(page, out), /<a href="estimate\.html">/);
});

// A dead link reads as a broken deliverable: an md-only run (no estimate skill
// render) must produce exactly the viewer it produces today.
test('no estimate.html beside the source means no link', () => {
  const { docs, out } = tree();
  const page = { kind: 'estimation', path: join(docs, 'estimation.md') };
  assert.equal(estimateLink(page, out), '');
});

test('only the estimation companion gets the link', () => {
  const { docs, out } = tree();
  writeFileSync(join(docs, 'estimate.html'), '<!doctype html>');
  for (const kind of ['spine', 'threat-model', 'domain-overview', undefined]) {
    assert.equal(estimateLink({ kind, path: join(docs, 'threat-model.md') }, out), '');
  }
});

test('the href is attribute-escaped', () => {
  const { docs, out } = tree();
  const evil = join(docs, 'a"b');
  mkdirSync(evil);
  writeFileSync(join(evil, 'estimate.html'), '<!doctype html>');
  const link = estimateLink({ kind: 'estimation', path: join(evil, 'estimation.md') }, out);
  assert.doesNotMatch(link, /href="[^"]*"b/);
  assert.match(link, /&quot;/);
});
