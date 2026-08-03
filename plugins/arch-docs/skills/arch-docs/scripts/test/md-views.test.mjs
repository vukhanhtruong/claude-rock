import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderViewGroup } from '../lib/md-views.mjs';

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
