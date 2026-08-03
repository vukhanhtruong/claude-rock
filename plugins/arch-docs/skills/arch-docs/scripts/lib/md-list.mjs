import { inline } from './md-inline.mjs';

const ITEM = /^(\s*)([-*]|\d+[.)])\s+(.*)$/;

export function isListItem(line) {
  return ITEM.test(line);
}

// Indent width varies (2 or 4 spaces), so depth is only ever compared against
// its neighbours — never against an absolute level.
function itemsFrom(lines, start) {
  const items = [];
  let i = start;
  while (i < lines.length && ITEM.test(lines[i])) {
    const [, pad, marker, text] = lines[i].match(ITEM);
    items.push({ depth: Math.floor(pad.length / 2), ordered: /\d/.test(marker), text });
    i += 1;
  }
  return { items, next: i };
}

// A nested list belongs inside the <li> above it, not beside it, or the
// stylesheet's `li > ul` spacing never applies and screen readers lose the
// parent/child relation.
function build(items, at, depth) {
  const tag = items[at].ordered ? 'ol' : 'ul';
  const out = [`<${tag}>`];
  let i = at;
  while (i < items.length && items[i].depth >= depth) {
    out.push(`<li>${inline(items[i].text)}`);
    i += 1;
    if (i < items.length && items[i].depth > depth) {
      const sub = build(items, i, items[i].depth);
      out.push(sub.html);
      i = sub.next;
    }
    out.push('</li>');
  }
  out.push(`</${tag}>`);
  return { html: out.join(''), next: i };
}

export function renderList(lines, start) {
  const { items, next } = itemsFrom(lines, start);
  return { html: build(items, 0, items[0].depth).html, next };
}
