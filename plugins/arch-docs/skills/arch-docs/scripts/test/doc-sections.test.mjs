import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bucketPages, landingOf, buildDoc, slugOf } from '../lib/doc-sections.mjs';
import { routeMap } from '../lib/doc-routes.mjs';

const page = (docId, section, path, html = '<h1>x</h1>') => ({ docId, section, path, html });
const count = (html, re) => [...html.matchAll(re)].length;

test('pages bucket into consecutive runs, preserving the caller order', () => {
  const buckets = bucketPages([
    page('a', 'Architecture', '/r/ARCHITECTURE.md'),
    page('b', 'Decision Records', '/r/docs/adr/0001.md'),
    page('c', 'Decision Records', '/r/docs/adr/0002.md'),
  ]);
  assert.deepEqual(buckets.map((b) => b.label), ['Architecture', 'Decision Records']);
  assert.deepEqual(buckets[1].pages.map((p) => p.docId), ['b', 'c']);
});

test('pages with no section land in one default bucket', () => {
  const buckets = bucketPages([page('a', null, '/r/a.md'), page('b', null, '/r/b.md')]);
  assert.equal(buckets.length, 1);
  assert.equal(buckets[0].label, 'Documents');
});

// A section routes only if its author shipped an index page — that is the
// opt-in. No document-count threshold: 15 records behind an index is a set you
// browse, 15 records with no index is a run of documents you read.
test('a section that ships an index.md has a landing page', () => {
  const bucket = bucketPages([
    page('r1', 'Decision Records', '/r/docs/adr/0001.md'),
    page('idx', 'Decision Records', '/r/docs/adr/index.md'),
  ])[0];
  assert.equal(landingOf(bucket).docId, 'idx');
});

test('README.md is a landing page when there is no index.md', () => {
  const bucket = bucketPages([
    page('r1', 'Decision Records', '/r/docs/adr/0001.md'),
    page('rm', 'Decision Records', '/r/docs/adr/README.md'),
  ])[0];
  assert.equal(landingOf(bucket).docId, 'rm');
});

test('index.md wins over README.md when a section ships both', () => {
  const bucket = bucketPages([
    page('rm', 'Decision Records', '/r/docs/adr/README.md'),
    page('idx', 'Decision Records', '/r/docs/adr/index.md'),
  ])[0];
  assert.equal(landingOf(bucket).docId, 'idx');
});

test('a section with no index page has no landing page', () => {
  const bucket = bucketPages([page('a', 'Architecture', '/r/ARCHITECTURE.md')])[0];
  assert.equal(landingOf(bucket), undefined);
});

test('every page is wrapped in its own element, keyed by its document id', () => {
  const html = buildDoc([page('a', 'Architecture', '/r/A.md', '<h1>A</h1>')]);
  assert.match(html, /<section class="page" id="page-a"[^>]*>\s*<h1>A<\/h1>\s*<\/section>/);
});

test('a section with an index is marked routed and names its landing page', () => {
  const html = buildDoc([
    page('r1', 'Decision Records', '/r/docs/adr/0001.md'),
    page('idx', 'Decision Records', '/r/docs/adr/index.md'),
  ]);
  assert.match(html, /data-section="Decision Records"/);
  assert.match(html, /data-routed/);
  assert.match(html, /data-landing="page-idx"/);
});

test('a section with no index is not routed', () => {
  const html = buildDoc([page('a', 'Architecture', '/r/ARCHITECTURE.md')]);
  assert.doesNotMatch(html, /data-routed/);
  assert.doesNotMatch(html, /data-landing/);
});

test('each page in a routed section carries its own title for the record list', () => {
  const html = buildDoc([
    { ...page('r1', 'Decision Records', '/r/docs/adr/0001.md'), title: 'ADR-0001: Foundation' },
    page('idx', 'Decision Records', '/r/docs/adr/index.md'),
  ]);
  assert.match(html, /data-title="ADR-0001: Foundation"/);
});

test('section labels and titles are escaped', () => {
  const html = buildDoc([{ ...page('a', 'R&D', '/r/a.md'), title: 'A & B' }]);
  assert.match(html, /data-section="R&amp;D"/);
  assert.match(html, /data-title="A &amp; B"/);
});

test('one wrapper per section, one page element per document', () => {
  const html = buildDoc([
    page('a', 'Architecture', '/r/A.md'),
    page('b', 'Decision Records', '/r/docs/adr/0001.md'),
    page('c', 'Decision Records', '/r/docs/adr/index.md'),
  ]);
  assert.equal(count(html, /class="doc-section"/g), 2);
  assert.equal(count(html, /class="page"/g), 3);
});

// The section holding the root architecture document is the spine of the set:
// it is read, not browsed. Left ungated, a 226-byte docs/architecture/README.md
// would win the landing slot and hide ARCHITECTURE.md behind a stub.
test('the section holding the root document never routes', () => {
  const bucket = bucketPages([
    { ...page('arch', 'Architecture', '/r/ARCHITECTURE.md'), spine: true },
    page('rm', 'Architecture', '/r/docs/architecture/README.md'),
  ])[0];
  assert.equal(landingOf(bucket), undefined);
  assert.doesNotMatch(buildDoc(bucket.pages), /data-routed/);
});

// Each section is its own page now, so it needs an address. The slug is derived
// from the label rather than a counter: #/decision-records survives a reordered
// --docs list and reads as a place, #/section-2 does neither.
test('a section carries a slug and an id so it can be routed to', () => {
  const html = buildDoc([page('a', 'Decision Records', '/r/docs/adr/0001.md')]);
  assert.match(html, /id="sec-decision-records"/);
  assert.match(html, /data-slug="decision-records"/);
});

test('a slug is reduced to what a url fragment can carry', () => {
  const html = buildDoc([page('a', 'C4 / Model & Views', '/r/a.md')]);
  assert.match(html, /data-slug="c4-model-views"/);
});

test('slugOf is exported so the rail names the same routes the document does', () => {
  assert.equal(slugOf('Decision Records'), 'decision-records');
  assert.equal(slugOf('R&D  Notes'), 'r-d-notes');
});

// Routes are per document now: the section is the grouping, the page is what
// opens. The map comes from the caller so the nav and the body cannot disagree.
test('every page carries the route that opens it', () => {
  const pages = [page('a', 'Architecture', '/r/ARCHITECTURE.md')];
  const html = buildDoc(pages, routeMap(pages));
  assert.match(html, /<section class="page" id="page-a" data-route="architecture"/);
});

test('a page with no route in the map is still rendered', () => {
  const html = buildDoc([page('a', 'Architecture', '/r/A.md')], new Map());
  assert.match(html, /id="page-a"/);
  assert.doesNotMatch(html, /data-route=/);
});

/* ---------- drawer sections ---------- */

// §14 Decisions already tables every ADR, so a Decision Records rail section is
// the same set a second time — and the one the reader did not ask for, since they
// were looking at §14 when they clicked. The records stay in the document (a
// drawer needs something to show) but the section is marked so the router opens
// them over the page instead of replacing it.
const rec = (id, n) => ({ ...page(id, 'Decision Records', `/r/docs/adr/${n}.md`), drawer: true });

test('a section of drawer pages is marked as one', () => {
  const html = buildDoc([
    page('a', 'Architecture', '/r/ARCHITECTURE.md'),
    rec('r1', '0001'), rec('r2', '0002'),
  ]);
  assert.match(html, /<div class="doc-section"[^>]*data-drawer/);
  // One section is a drawer, the other is not — the flag is per section, not global.
  assert.equal(count(html, /data-drawer/g), 1);
});

test('a section with no drawer pages is not marked', () => {
  const html = buildDoc([page('a', 'Architecture', '/r/ARCHITECTURE.md')]);
  assert.doesNotMatch(html, /data-drawer/);
});

// The records still need addresses: a drawer without a route cannot be linked to
// or reloaded into view, which is the whole reason to keep the hash in step.
test('drawer pages keep their routes', () => {
  const pages = [page('a', 'Architecture', '/r/ARCHITECTURE.md'), rec('r1', '0001')];
  const routes = routeMap(pages);
  const html = buildDoc(pages, routes);
  assert.match(html, /id="page-r1"[^>]*data-route="0001"/);
});

// The injection loop selects [data-kind="spine"] h2, so the attribute is the
// only thing telling the client which document is the spine and which of the
// three companions each other document is. Absent, every explainer is missing.
test('a page carries its document kind', () => {
  const html = buildDoc([
    { docId: 'a', title: 'Arch', html: '<h2>x</h2>', headings: [], kind: 'spine' },
  ]);
  assert.match(html, /data-kind="spine"/);
});

// A document with no kind renders exactly as it does today. An empty
// data-kind="" would match [data-kind] selectors and is worse than absence.
test('a page with no kind carries no kind attribute', () => {
  const html = buildDoc([
    { docId: 'b', title: 'ADR 1', html: '<h2>x</h2>', headings: [] },
  ]);
  assert.doesNotMatch(html, /data-kind/);
});
