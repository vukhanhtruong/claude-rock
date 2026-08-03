import { escapeHtml, stripInline } from './md-inline.mjs';

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

function group(page, open) {
  const doc = page.docId ? ` data-doc="${escapeHtml(page.docId)}"` : '';
  const title = escapeHtml(stripInline(page.title));
  return [
    `<details class="nav-group"${open ? ' open' : ''}${doc}>`,
    `<summary class="nav-group__head" title="${title}">${CHEVRON}`,
    `<span class="nav-group__title">${title}</span>`,
    `<span class="nav-group__count">${page.headings.length}</span>`,
    '</summary>',
    `<div class="nav-group__body">${page.headings.map(link).join('')}</div>`,
    '</details>',
  ].join('');
}

function section(bucket, index) {
  const label = escapeHtml(bucket.label);
  const docs = bucket.pages.map((p, i) => group(p, index === 0 && i === 0)).join('');
  return [
    `<details class="nav-sec"${index === 0 ? ' open' : ''}>`,
    `<summary class="nav-sec__head">${CHEVRON}`,
    `<span class="nav-sec__title">${label}</span>`,
    `<span class="nav-sec__count">${bucket.pages.length}</span>`,
    '</summary>',
    `<div class="nav-sec__body">${docs}</div>`,
    '</details>',
  ].join('');
}

// Buckets are consecutive runs, not a group-by: the caller's document order is
// the reading order, and reordering the rail to match a sort would break it.
function bucket(pages) {
  const out = [];
  for (const page of pages) {
    const label = page.section || 'Documents';
    const last = out[out.length - 1];
    if (last && last.label === label) last.pages.push(page);
    else out.push({ label, pages: [page] });
  }
  return out;
}

export function buildNav(pages) {
  return bucket(pages).map(section).join('\n');
}
