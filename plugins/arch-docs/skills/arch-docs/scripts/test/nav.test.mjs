import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNav } from '../lib/nav.mjs';

const page = (title, docId, headings, section) => ({ title, docId, headings, section });
const h = (level, text, slug) => ({ level, text, slug });
const count = (nav, re) => [...nav.matchAll(re)].length;

test('each document becomes one collapsible group, not a flat link list', () => {
  const nav = buildNav([
    page('Architecture', 'doc-architecture', [h(2, 'Goals', 'goals')]),
    page('Threat Model', 'doc-threat-model', [h(2, 'Threats', 'threats')]),
  ]);
  assert.equal(count(nav, /class="nav-group"/g), 2);
  assert.match(nav, /<summary[^>]*>[\s\S]*?Architecture[\s\S]*?<\/summary>/);
  assert.match(nav, /<summary[^>]*>[\s\S]*?Threat Model[\s\S]*?<\/summary>/);
});

test('group carries its document anchor and section count', () => {
  const nav = buildNav([
    page('Architecture', 'doc-architecture', [h(2, 'A', 'a'), h(2, 'B', 'b'), h(3, 'C', 'c')]),
  ]);
  assert.match(nav, /data-doc="doc-architecture"/);
  assert.match(nav, /nav-group__count[^>]*>3</);
});

test('h3 headings are marked as sub-items so the rail shows depth', () => {
  const nav = buildNav([page('D', 'doc-d', [h(2, 'Parent', 'parent'), h(3, 'Child', 'child')])]);
  assert.match(nav, /class="nav-link"[^>]*href="#parent"/);
  assert.match(nav, /class="nav-link nav-link--sub"[^>]*href="#child"/);
});

test('the first group is open and later groups are collapsed', () => {
  const nav = buildNav([
    page('First', 'doc-first', [h(2, 'A', 'a')]),
    page('Second', 'doc-second', [h(2, 'B', 'b')]),
  ]);
  const groups = nav.match(/<details class="nav-group"[^>]*>/g);
  assert.match(groups[0], / open/);
  assert.doesNotMatch(groups[1], / open/);
});

test('titles and labels are html-escaped', () => {
  const nav = buildNav([page('A & B', 'doc-a', [h(2, '<script>x</script>', 'x')])]);
  assert.match(nav, /A &amp; B/);
  assert.doesNotMatch(nav, /<script>/);
  assert.match(nav, /&lt;script&gt;/);
});

test('a document with no sections still renders its group', () => {
  const nav = buildNav([page('Empty', 'doc-empty', [])]);
  assert.match(nav, /doc-empty/);
  assert.match(nav, /nav-group__count[^>]*>0</);
});

test('every section link is filterable by its plain-text label', () => {
  const nav = buildNav([page('D', 'doc-d', [h(2, 'Data Stores', 'data-stores')])]);
  assert.match(nav, /data-label="data stores"/);
});

// A rail of 21 document groups is no better than a rail of 120 headings: the
// 17 ADRs bury everything else. Documents bucket into named sections so the
// whole decision-record run collapses to one row.
test('documents bucket into named sections', () => {
  const nav = buildNav([
    page('Architecture', 'doc-a', [h(2, 'Goals', 'goals')], 'Architecture'),
    page('ADR 1', 'doc-1', [h(2, 'Status', 'status')], 'Decision Records'),
    page('ADR 2', 'doc-2', [h(2, 'Status', 'status-2')], 'Decision Records'),
  ]);
  assert.equal(count(nav, /class="nav-sec"/g), 2);
  assert.equal(count(nav, /class="nav-group"/g), 3);
  assert.match(nav, /nav-sec__title[^>]*>Decision Records</);
});

test('a section counts its documents, not their headings', () => {
  const nav = buildNav([
    page('ADR 1', 'doc-1', [h(2, 'a', 'a'), h(2, 'b', 'b')], 'Decision Records'),
    page('ADR 2', 'doc-2', [h(2, 'c', 'c')], 'Decision Records'),
  ]);
  assert.match(nav, /nav-sec__count[^>]*>2</);
});

test('only the first section opens, so a trailing ADR block stays collapsed', () => {
  const nav = buildNav([
    page('Arch', 'doc-a', [h(2, 'a', 'a')], 'Architecture'),
    page('ADR 1', 'doc-1', [h(2, 'b', 'b')], 'Decision Records'),
  ]);
  const secs = nav.match(/<details class="nav-sec"[^>]*>/g);
  assert.match(secs[0], / open/);
  assert.doesNotMatch(secs[1], / open/);
});

test('the open group is the first of the open section only', () => {
  const nav = buildNav([
    page('Arch', 'doc-a', [h(2, 'a', 'a')], 'Architecture'),
    page('ADR 1', 'doc-1', [h(2, 'b', 'b')], 'Decision Records'),
    page('ADR 2', 'doc-2', [h(2, 'c', 'c')], 'Decision Records'),
  ]);
  assert.equal(count(nav, /<details class="nav-group" open/g), 1);
});

test('pages with no section land in one default bucket', () => {
  const nav = buildNav([page('A', 'doc-a', []), page('B', 'doc-b', [])]);
  assert.equal(count(nav, /class="nav-sec"/g), 1);
  assert.match(nav, /nav-sec__title[^>]*>Documents</);
});

test('section labels are html-escaped', () => {
  const nav = buildNav([page('A', 'doc-a', [], 'R&D')]);
  assert.match(nav, /nav-sec__title[^>]*>R&amp;D</);
});

// Headings carry inline markdown. The rail renders labels as plain text, so
// without stripping, a document titled with `org_id` shows its backticks in
// the sidebar and in the breadcrumb.
test('inline markdown never reaches the rail as literal syntax', () => {
  const nav = buildNav([
    page('ADR: `org_id` and **RLS**', 'doc-a', [h(2, 'Uses `code`', 'uses-code')], 'Decision Records'),
  ]);
  assert.match(nav, /nav-group__title">ADR: org_id and RLS</);
  assert.match(nav, /data-label="uses code"/);
  assert.doesNotMatch(nav, /`/);
  assert.doesNotMatch(nav, /\*\*/);
});

// A routed section is browsed from its index page, not from the rail: 15 record
// rows in the sidebar is the wall the whole two-level design exists to remove.
test('a routed section shows only its landing document in the rail', () => {
  const nav = buildNav([
    { ...page('ADR 1', 'doc-1', [h(2, 'a', 'a')], 'Decision Records'), path: '/r/adr/0001.md' },
    { ...page('Records', 'doc-idx', [h(2, 'b', 'b')], 'Decision Records'), path: '/r/adr/index.md' },
  ]);
  assert.equal(count(nav, /class="nav-group"/g), 1);
  assert.match(nav, /nav-group__title">Records</);
  assert.doesNotMatch(nav, /ADR 1/);
});

test('a routed section still counts every document it holds', () => {
  const nav = buildNav([
    { ...page('ADR 1', 'doc-1', [], 'Decision Records'), path: '/r/adr/0001.md' },
    { ...page('ADR 2', 'doc-2', [], 'Decision Records'), path: '/r/adr/0002.md' },
    { ...page('Records', 'doc-idx', [], 'Decision Records'), path: '/r/adr/index.md' },
  ]);
  assert.match(nav, /nav-sec__count[^>]*>3</);
});

test('a section with no index page keeps a group per document', () => {
  const nav = buildNav([
    { ...page('One', 'doc-1', [], 'Architecture'), path: '/r/a.md' },
    { ...page('Two', 'doc-2', [], 'Architecture'), path: '/r/b.md' },
  ]);
  assert.equal(count(nav, /class="nav-group"/g), 2);
});
