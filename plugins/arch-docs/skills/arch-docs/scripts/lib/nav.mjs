import { escapeHtml, stripInline } from './md-inline.mjs';
import { bucketPages, landingOf, slugOf } from './doc-sections.mjs';

// The rail is two levels deep. One <details> per source document keeps the ~120
// headings of a real set from reading as a wall of near-duplicate labels
// ("Status", "Context", "Decision" once per ADR). But 21 document rows is the
// same wall one level up — 17 of them ADRs — so documents bucket into named
// sections and the whole decision-record run collapses to a single row.

const CHEVRON = '<svg class="nav-chevron" viewBox="0 0 12 12" aria-hidden="true">'
  + '<path d="M4.5 2.5 L8 6 L4.5 9.5" fill="none" stroke="currentColor" stroke-width="1.5"'
  + ' stroke-linecap="round" stroke-linejoin="round"/></svg>';

function link(heading) {
  const cls = heading.level === 3 ? 'nav-link nav-link--sub' : 'nav-link';
  const text = stripInline(heading.text);
  const label = escapeHtml(text);
  const filter = escapeHtml(text.toLowerCase());
  return `<a class="${cls}" href="#${heading.slug}" data-label="${filter}">${label}</a>`;
}

function group(page, open, route) {
  const doc = page.docId ? ` data-doc="${escapeHtml(page.docId)}"` : '';
  const title = escapeHtml(stripInline(page.title));
  return [
    `<details class="nav-group"${route ? ` data-route="${route}"` : ''}`
      + `${open ? ' open' : ''}${doc}>`,
    `<summary class="nav-group__head" title="${title}">${CHEVRON}`,
    `<span class="nav-group__title">${title}</span>`,
    `<span class="nav-group__count">${page.headings.length}</span>`,
    '</summary>',
    `<div class="nav-group__body">${page.headings.map(link).join('')}</div>`,
    '</details>',
  ].join('');
}

// A routed section is browsed from its index page, so the rail shows that one
// document and stops. Listing all 15 records here would rebuild the wall the
// two-level rail exists to remove; the count still tells you how many there are.
function section(bucket, index, routes) {
  const label = escapeHtml(bucket.label);
  const landing = landingOf(bucket);
  const shown = landing ? [landing] : bucket.pages;
  const docs = shown.map((p, i) => group(p, index === 0 && i === 0, routes.get(p.docId))).join('');
  // The section row opens its index page, or its first document when it has
  // none: a row that routes nowhere is a toggle over documents not on screen.
  const route = routes.get(shown[0].docId) ?? slugOf(bucket.label);
  return [
    `<details class="nav-sec" data-sec="${slugOf(bucket.label)}" data-route="${route}"`
      + `${index === 0 ? ' open' : ''}>`,
    `<summary class="nav-sec__head">${CHEVRON}`,
    `<span class="nav-sec__title">${label}</span>`,
    `<span class="nav-sec__count">${bucket.pages.length}</span>`,
    '</summary>',
    `<div class="nav-sec__body">${docs}</div>`,
    '</details>',
  ].join('');
}

export function buildNav(pages, routes = new Map()) {
  return bucketPages(pages).map((b, i) => section(b, i, routes)).join('\n');
}
