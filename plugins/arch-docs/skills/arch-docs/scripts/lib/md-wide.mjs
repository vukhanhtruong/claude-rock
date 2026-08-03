import { inline } from './md-inline.mjs';

// A table's shape is a claim: these rows are comparable, read across. Eight
// columns describing one integration (§9) makes that claim about nothing — every
// cell wraps to four lines under a header there is no second row to compare
// against. Turned sideways it is what it always was, a record with fields.
//
// Both conditions, not either: a wide table with many rows is a real comparison,
// and a narrow one was never the problem.
const WIDE_COLS = 5;
const FEW_ROWS = 3;

export function isWideTable(headers, rows) {
  if (!rows.length) return false;
  return headers.length >= WIDE_COLS && rows.length <= FEW_ROWS;
}

// The first column is the record's name, so it heads the card instead of becoming
// a field of it — "Integration: Google OAuth" is one field too many. A row shorter
// than its header skips the rest rather than emitting empty <dd>s, which read as
// documented blanks.
function card(headers, row) {
  const fields = headers.slice(1)
    .map((h, i) => [h, row[i + 1]])
    .filter(([, v]) => v)
    .map(([h, v]) => `<div class="rec-field"><dt>${inline(h)}</dt><dd>${inline(v)}</dd></div>`)
    .join('');
  return `<div class="rec-card"><p class="rec-card__name">${inline(row[0] ?? '')}</p>`
    + `<dl class="rec-card__fields">${fields}</dl></div>`;
}

export function renderWideCards(headers, rows) {
  return `<div class="rec-cards">${rows.map((r) => card(headers, r)).join('')}</div>`;
}
