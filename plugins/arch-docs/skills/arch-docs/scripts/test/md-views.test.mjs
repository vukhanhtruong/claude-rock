import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderViewGroup, renderFlowTabs } from '../lib/md-views.mjs';

test('a single view renders as a bare diagram shell, with no tab chrome', () => {
  const html = renderViewGroup(['deployment']);
  assert.match(html, /<div class="diagram-shell"><c4-view view-id="deployment"><\/c4-view><\/div>/);
  assert.doesNotMatch(html, /view-tabs/);
});

test('several views render as one tab group', () => {
  const html = renderViewGroup(['index', 'containers', 'components-api']);
  assert.match(html, /class="view-tabs"/);
  assert.equal([...html.matchAll(/role="tab"/g)].length, 3);
  assert.equal([...html.matchAll(/role="tabpanel"/g)].length, 3);
  assert.equal([...html.matchAll(/<c4-view /g)].length, 3);
});

test('the first tab is selected and the rest are hidden', () => {
  const html = renderViewGroup(['index', 'containers']);
  assert.equal([...html.matchAll(/aria-selected="true"/g)].length, 1);
  assert.equal([...html.matchAll(/<div class="view-panel" hidden/g)].length, 1);
  assert.match(html, /aria-selected="true"[^>]*>index</);
});

test('each panel is wired to its tab for screen readers', () => {
  const html = renderViewGroup(['index', 'containers']);
  assert.match(html, /id="tab-index"[^>]*aria-controls="panel-index"/);
  assert.match(html, /id="panel-index"[^>]*aria-labelledby="tab-index"/);
});

test('view ids are escaped so a crafted id cannot break out of the attribute', () => {
  const html = renderViewGroup(['a"><script>x</script>', 'b']);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&quot;/);
});

/* ---------- flow tabs ---------- */

// Same tab chrome, but each panel carries the prose that explained its diagram.
// The tab is labelled with the flow's name, because `flow-oauth-login` is a view
// id and nobody reading chose it.
const FLOWS = [
  { id: 'flow-oauth-login', label: 'Google OAuth login', prose: '**Google OAuth login.** No secret in the browser.' },
  { id: 'flow-tenant-scoped-read', label: 'Tenant-scoped read', prose: '**Tenant-scoped read.** Re-derived per request.' },
];

test('a flow group tabs on its labels, not its view ids', () => {
  const html = renderFlowTabs(FLOWS);
  assert.match(html, /class="view-tabs"/);
  assert.match(html, /aria-selected="true"[^>]*>Google OAuth login</);
  assert.doesNotMatch(html, />flow-oauth-login</);
});

test('each panel holds its own prose above its own diagram', () => {
  const html = renderFlowTabs(FLOWS);
  const first = html.slice(html.indexOf('id="panel-flow-oauth-login"'), html.indexOf('id="panel-flow-tenant-scoped-read"'));
  assert.match(first, /No secret in the browser/);
  assert.match(first, /view-id="flow-oauth-login"/);
  assert.doesNotMatch(first, /Re-derived per request/);
});

// The lead-in is already the tab label, so repeating it as bold text at the top of
// the panel says the same thing twice in two type sizes.
test('the lead-in is not repeated inside the panel it labels', () => {
  const html = renderFlowTabs(FLOWS);
  assert.doesNotMatch(html, /<strong>Google OAuth login/);
});

test('a crafted label cannot break out of the panel', () => {
  const html = renderFlowTabs([
    { id: 'a', label: '<script>x</script>', prose: '**a.** p' },
    { id: 'b', label: 'b', prose: '**b.** p' },
  ]);
  assert.doesNotMatch(html, /<script>/);
});
