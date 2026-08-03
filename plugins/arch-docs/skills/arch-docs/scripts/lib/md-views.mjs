import { escapeHtml, inline } from './md-inline.mjs';

// Consecutive view markers are one system at several zoom levels — stacked they
// are ~1900px of scroll the reader cannot compare across. Markers with prose
// between them are separate scenarios, and md-flows.mjs groups those instead,
// carrying each one's prose into its own panel.

const shell = (id) => `<div class="diagram-shell"><c4-view view-id="${id}"></c4-view></div>`;

function tab(id, label, i) {
  return `<button class="view-tab" role="tab" id="tab-${id}" aria-controls="panel-${id}"`
    + ` aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${label}</button>`;
}

function panel(id, body, i) {
  return `<div class="view-panel"${i ? ' hidden' : ''} id="panel-${id}" role="tabpanel"`
    + ` aria-labelledby="tab-${id}">${body}</div>`;
}

function tabsEl(items) {
  return [
    '<div class="view-tabs">',
    `<div class="view-tabs__bar" role="tablist">${items.map((t) => t.tab).join('')}</div>`,
    items.map((t) => t.panel).join(''),
    '</div>',
  ].join('');
}

export function renderViewGroup(ids) {
  const safe = ids.map(escapeHtml);
  if (safe.length === 1) return shell(safe[0]);
  return tabsEl(safe.map((id, i) => ({
    tab: tab(id, id, i),
    panel: panel(id, shell(id), i),
  })));
}

// The lead-in is already the tab label, so it is stripped from the prose rather
// than repeated as bold text at the top of the panel it labels.
const dropLead = (prose) => prose.replace(/^\*\*.+?\*\*\s*/, '');

export function renderFlowTabs(units) {
  return tabsEl(units.map((unit, i) => {
    const id = escapeHtml(unit.id);
    const body = `<p>${inline(dropLead(unit.prose))}</p>${shell(id)}`;
    return { tab: tab(id, escapeHtml(unit.label), i), panel: panel(id, body, i) };
  }));
}
