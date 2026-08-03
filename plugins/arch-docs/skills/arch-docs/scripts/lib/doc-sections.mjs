import { basename } from 'node:path';
import { escapeHtml } from './md-inline.mjs';

const LANDING = ['index.md', 'readme.md'];

// Buckets are consecutive runs, not a group-by: the caller's document order is
// the reading order, and reordering to match a sort would break it.
export function bucketPages(pages) {
  const out = [];
  for (const page of pages) {
    const label = page.section || 'Documents';
    const last = out[out.length - 1];
    if (last && last.label === label) last.pages.push(page);
    else out.push({ label, pages: [page] });
  }
  return out;
}

// A section routes only if its author shipped an index page — that is the
// opt-in, and it needs no document-count threshold. Fifteen records behind an
// index is a set you browse; fifteen records with no index is a run of
// documents you read straight through, and hiding them would only lose you the
// scroll.
export function landingOf(bucket) {
  // The section holding the root architecture document is the spine of the set:
  // read, not browsed. Ungated, a 226-byte docs/architecture/README.md would win
  // the landing slot and hide ARCHITECTURE.md itself behind a stub.
  if (bucket.pages.some((p) => p.spine)) return undefined;
  const rank = (page) => LANDING.indexOf(basename(page.path ?? '').toLowerCase());
  return bucket.pages.filter((p) => rank(p) >= 0).sort((a, b) => rank(a) - rank(b))[0];
}

function pageEl(page, route) {
  const title = escapeHtml(stripTitle(page.title));
  const at = route ? ` data-route="${route}"` : '';
  return `<section class="page" id="page-${page.docId}"${at} data-title="${title}">`
    + `\n${page.html}\n</section>`;
}

function stripTitle(title) {
  return (title ?? '').replace(/`([^`]+)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1');
}

// Each section is its own page, so it needs an address. Derived from the label
// rather than a counter: #/decision-records reads as a place and survives a
// reordered --docs list, #/section-2 does neither.
export function slugOf(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function sectionEl(bucket, routes) {
  const landing = landingOf(bucket);
  const routed = landing ? ` data-routed data-landing="page-${landing.docId}"` : '';
  const slug = slugOf(bucket.label);
  const inner = bucket.pages.map((p) => pageEl(p, routes.get(p.docId))).join('\n');
  return `<div class="doc-section" id="sec-${slug}" data-slug="${slug}"`
    + ` data-section="${escapeHtml(bucket.label)}"${routed}>${inner}</div>`;
}

// routes default to empty so a caller that has not built them still renders a
// readable document — it just has no addresses.
export function buildDoc(pages, routes = new Map()) {
  return bucketPages(pages).map((b) => sectionEl(b, routes)).join('\n');
}
