import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isWideTable, isCrampedTable, renderWideCards } from '../lib/md-wide.mjs';

// §9 External Integrations is eight columns describing one integration. As a
// table that is a single row whose every cell wraps to four lines under a header
// nobody can scan across — the shape says "compare these" when there is nothing
// to compare. Turned sideways it is what it always was: a record with fields.
const H9 = ['Integration', 'Method', 'Auth and credential home', 'Failure mode',
  'Rate limit / cost', 'Data leaving the boundary', 'Lock-in', 'src'];
const R9 = [['Google OAuth', 'HTTPS authorization-code flow', 'Client id from env',
  'Login unavailable', 'No published quota', 'client id and scopes', 'Low', 'researched']];

test('a wide table with few rows is a record, not a comparison', () => {
  assert.equal(isWideTable(H9, R9), true);
});

// The threshold is both conditions, not either. A wide table with many rows is a
// real comparison and has to stay a table; a narrow one was never the problem.
test('a wide table with enough rows stays a table', () => {
  const many = Array.from({ length: 6 }, () => R9[0]);
  assert.equal(isWideTable(H9, many), false);
});

test('a narrow table stays a table however few rows it has', () => {
  assert.equal(isWideTable(['ADR', 'Title', 'Status'], [['0001', 'x', 'Accepted']]), false);
  assert.equal(isWideTable(['Term', 'Definition'], [['a', 'b']]), false);
});

test('an empty table is not a record', () => {
  assert.equal(isWideTable(H9, []), false);
});

// The first column is the record's name, so it heads the card rather than
// becoming a field of it — a card titled "Integration: Google OAuth" reads as one
// field too many.
test('the first column titles the card and the rest are its fields', () => {
  const html = renderWideCards(H9, R9);
  assert.match(html, /class="rec-card"/);
  assert.match(html, /class="rec-card__name">Google OAuth</);
  assert.doesNotMatch(html, /<dt>Integration<\/dt>/);
  assert.match(html, /<dt>Method<\/dt>/);
  assert.match(html, /<dd>HTTPS authorization-code flow<\/dd>/);
  assert.match(html, /<dt>Lock-in<\/dt>/);
});

test('one card per row', () => {
  const two = [R9[0], ['GitHub OAuth', 'b', 'c', 'd', 'e', 'f', 'g', 'h']];
  const html = renderWideCards(H9, two);
  assert.equal(html.match(/class="rec-card"/g).length, 2);
  assert.match(html, /GitHub OAuth/);
});

// Inline markup has to survive: §9's src column is a bracketed reference and the
// method column carries code spans.
test('cell markup is rendered, not escaped into the card', () => {
  const html = renderWideCards(['Name', 'Detail'], [['x', 'reads `OAUTH_ID` from env']]);
  assert.match(html, /<code>OAUTH_ID<\/code>/);
});

// A short row leaves the field missing rather than emitting an empty <dd> that
// looks like a documented blank.
test('a row shorter than its header skips the missing fields', () => {
  const html = renderWideCards(['Name', 'A', 'B'], [['x', 'only-a']]);
  assert.match(html, /<dt>A<\/dt>/);
  assert.doesNotMatch(html, /<dt>B<\/dt>/);
});

// A wide table that keeps enough rows to stay a table still has to fit: §6 is
// eight columns of eight components, ~110px per column at the standard scale.
// The class is what earns it a tighter one.
test('a table wide enough to cramp its columns is marked for a tighter scale', () => {
  assert.equal(isCrampedTable(['a', 'b', 'c', 'd', 'e', 'f', 'g']), true);
  assert.equal(isCrampedTable(['a', 'b', 'c', 'd', 'e', 'f']), false);
  assert.equal(isCrampedTable(['ADR', 'Title', 'Status']), false);
});
