import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeMap } from '../lib/doc-routes.mjs';

const page = (docId, section, path) => ({ docId, section, path });
const routes = (pages) => [...routeMap(pages).values()];

// A document is what a reader opens, so a document is what gets a route. The
// slug comes from the source filename rather than the H1: a title gets
// reworded, a filename is the thing every other document already links to.
test('each document gets a route named after its source file', () => {
  const pages = [
    page('a', 'Architecture', '/r/ARCHITECTURE.md'),
    page('b', 'Architecture', '/r/docs/architecture/DOMAIN-OVERVIEW.md'),
    page('c', 'Architecture', '/r/docs/architecture/threat-model.md'),
  ];
  assert.deepEqual(routes(pages), ['architecture', 'domain-overview', 'threat-model']);
});

// #/decision-records has to land on the list, not on a file called index.
test("a section's index page takes the section slug instead of its filename", () => {
  const pages = [
    page('r1', 'Decision Records', '/r/docs/adr/0001-foundation.md'),
    page('idx', 'Decision Records', '/r/docs/adr/index.md'),
  ];
  assert.deepEqual(routes(pages), ['0001-foundation', 'decision-records']);
});

test('the spine document keeps its own filename route, never the section slug', () => {
  // Its section has no landing page, so nothing claims the section slug — and
  // ARCHITECTURE.md arriving at #/architecture is the same string either way.
  const pages = [{ ...page('a', 'Architecture', '/r/ARCHITECTURE.md'), spine: true }];
  assert.deepEqual(routes(pages), ['architecture']);
});

test('two documents with the same filename get distinct routes', () => {
  const pages = [
    // Not README.md: a lone README is its section's landing and takes the
    // section slug instead of its filename.
    page('a', 'Architecture', '/r/docs/architecture/notes.md'),
    page('b', 'Guides', '/r/docs/guides/notes.md'),
  ];
  assert.deepEqual(routes(pages), ['notes', 'notes-2']);
});

test('a filename is reduced to what a url fragment can carry', () => {
  const pages = [page('a', 'Architecture', '/r/docs/C4 Model & Views.md')];
  assert.deepEqual(routes(pages), ['c4-model-views']);
});

test('routes are keyed by document id so the nav and the body agree', () => {
  const pages = [page('doc-x', 'Architecture', '/r/ARCHITECTURE.md')];
  assert.equal(routeMap(pages).get('doc-x'), 'architecture');
});
