import { inline } from './md-inline.mjs';

// A two-column table whose right column runs to prose is a definition list
// wearing a table costume — 19 rows of hairline dividers where a card grid
// reads in one pass. Two columns of short values (Property | Value) is real
// tabular data and stays a table, so the test is the right column's length.
const PROSE_LEN = 60;

export function isDefinitionTable(headers, rows) {
  if (headers.length !== 2 || !rows.length) return false;
  const total = rows.reduce((n, row) => n + (row[1] ?? '').length, 0);
  return total / rows.length > PROSE_LEN;
}

export function renderDefinitions(rows) {
  const items = rows
    .map(([term, def]) => `<div class="def"><dt>${inline(term)}</dt><dd>${inline(def)}</dd></div>`)
    .join('');
  return `<dl class="def-grid">${items}</dl>`;
}
