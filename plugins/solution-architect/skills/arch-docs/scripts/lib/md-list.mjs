import { inline } from './md-inline.mjs';
import { ITEM, shapeOf } from './md-shape.mjs';

const INDENTED = /^\s+\S/;

// A long bullet wraps in the source, and its second line matches nothing. Ending
// the list there is what turned §4 Solution Strategy — five bullets, each with a
// trailing ADR link — into five one-item lists interleaved with five indented
// paragraphs, one per orphaned link. An indented continuation belongs to the item
// above it, which is what CommonMark calls a lazy continuation — only the
// indented half of it: an unindented continuation is left alone, because this
// renderer needs no blank line before a paragraph, so absorbing it would swallow
// the next block instead of just the item's own wrapped text.
//
// Whether an indented line still counts as a continuation, rather than a block
// of its own, is read from shapeOf — the one place that already answers that
// question for every other shape a line can be. A fence, table, heading or
// marker stays its own block, indented or not; only a plain line joins.
function isContinuation(lines, i) {
  return INDENTED.test(lines[i]) && shapeOf(lines, i) === 'paragraph';
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
    } else if (items.length && isContinuation(lines, i)) {
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
