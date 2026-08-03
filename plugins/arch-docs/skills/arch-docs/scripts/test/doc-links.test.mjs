import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rewriteDocLinks } from '../lib/doc-links.mjs';

const ids = new Map([
  ['/repo/docs/adr/0002-rls.md', 'doc-adr-0002-multi-tenancy'],
  ['/repo/ARCHITECTURE.md', 'doc-architecture'],
]);

test('a link to a document in the set becomes an in-page anchor', () => {
  const html = rewriteDocLinks(
    '<p><a href="0002-rls.md">ADR-0002</a></p>', '/repo/docs/adr/index.md', ids,
  );
  assert.match(html, /<a href="#doc-adr-0002-multi-tenancy">ADR-0002<\/a>/);
});

test('relative hrefs resolve against the linking document, not the repo root', () => {
  const html = rewriteDocLinks(
    '<p><a href="../../ARCHITECTURE.md">arch</a></p>', '/repo/docs/adr/index.md', ids,
  );
  assert.match(html, /href="#doc-architecture"/);
});

test('a root-relative href resolves the same way', () => {
  const html = rewriteDocLinks(
    '<p><a href="docs/adr/0002-rls.md">x</a></p>', '/repo/ARCHITECTURE.md', ids,
  );
  assert.match(html, /href="#doc-adr-0002-multi-tenancy"/);
});

// Heading slugs are deduped across the whole set, so #context inside ADR-0002
// may have been minted as context-7. The document anchor is the honest target.
test('a fragment on a document link is dropped rather than guessed at', () => {
  const html = rewriteDocLinks(
    '<p><a href="0002-rls.md#context">why</a></p>', '/repo/docs/adr/index.md', ids,
  );
  assert.match(html, /href="#doc-adr-0002-multi-tenancy"/);
  assert.doesNotMatch(html, /#context/);
});

// A link to a file the viewer does not contain has nothing to navigate to. Left
// alone it still looks clickable, which is worse than plain text.
test('a link to a document outside the set is unwrapped, keeping its text', () => {
  const html = rewriteDocLinks(
    '<p>see <a href="docs/PRD.md">docs/PRD.md</a>.</p>', '/repo/ARCHITECTURE.md', ids,
  );
  assert.doesNotMatch(html, /<a /);
  assert.match(html, /class="ext-ref"[^>]*>docs\/PRD\.md<\/span>/);
  assert.match(html, /<p>see .*\.<\/p>/);
});

test('an unwrapped reference keeps the original path in its title', () => {
  const html = rewriteDocLinks(
    '<p><a href="docs/PRD.md">the PRD</a></p>', '/repo/ARCHITECTURE.md', ids,
  );
  assert.match(html, /title="docs\/PRD\.md"/);
});

test('http and in-page hrefs are left untouched', () => {
  const src = '<p><a href="https://example.com/x.md">ext</a><a href="#goals">g</a></p>';
  assert.equal(rewriteDocLinks(src, '/repo/ARCHITECTURE.md', ids), src);
});

test('a document with no links is returned unchanged', () => {
  const src = '<p>no links here</p>';
  assert.equal(rewriteDocLinks(src, '/repo/ARCHITECTURE.md', ids), src);
});
