import { inline } from './md-inline.mjs';

const ITEM = /^(\s*)([-*]|\d+[.)])\s+(.*)$/;
const INDENTED = /^\s+\S/;
// A fence, table row or heading is its own block whether or not it is indented,
// so it ends the list rather than joining the item above it. Without this an
// unblanked table after a bullet is flattened into that bullet's text.
const BLOCK = /^(```|~~~|\||#)/;

export function isListItem(line) {
  return ITEM.test(line);
}

// A long bullet wraps in the source, and its second line matches nothing. Ending
// the list there is what turned §4 Solution Strategy — five bullets, each with a
// trailing ADR link — into five one-item lists interleaved with five indented
// paragraphs, one per orphaned link. An indented continuation belongs to the item
// above it, which is what CommonMark calls a lazy continuation.
function isContinuation(line) {
  return INDENTED.test(line) && !BLOCK.test(line.trim());
}

// Indent width varies (2 or 4 spaces), so depth is only ever compared against
// its neighbours — never against an absolute level.
function itemsFrom(lines, start) {
  const items = [];
  let i = start;
  while (i < lines.length) {
    const m = lines[i].match(ITEM);
    if (m) {
      items.push({ depth: Math.floor(m[1].length / 2), ordered: /\d/.test(m[2]), text: m[3] });
    } else if (items.length && isContinuation(lines[i])) {
      items[items.length - 1].text += ` ${lines[i].trim()}`;
    } else break;
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
