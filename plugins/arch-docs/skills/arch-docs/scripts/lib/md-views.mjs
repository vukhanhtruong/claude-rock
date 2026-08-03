import { escapeHtml } from './md-inline.mjs';

// Consecutive view markers are one system at several zoom levels — stacked they
// are ~1900px of scroll the reader cannot compare across. Markers with prose
// between them are separate scenarios and stay separate shells.

const shell = (id) => `<div class="diagram-shell"><c4-view view-id="${id}"></c4-view></div>`;

function tab(id, i) {
  return `<button class="view-tab" role="tab" id="tab-${id}" aria-controls="panel-${id}"`
    + ` aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${id}</button>`;
}

function panel(id, i) {
  return `<div class="view-panel"${i ? ' hidden' : ''} id="panel-${id}" role="tabpanel"`
    + ` aria-labelledby="tab-${id}">${shell(id)}</div>`;
}

export function renderViewGroup(ids) {
  const safe = ids.map(escapeHtml);
  if (safe.length === 1) return shell(safe[0]);
  return [
    '<div class="view-tabs">',
    `<div class="view-tabs__bar" role="tablist">${safe.map(tab).join('')}</div>`,
    safe.map(panel).join(''),
    '</div>',
  ].join('');
}
