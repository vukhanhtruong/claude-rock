import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../lib/md-render.mjs';

test('renders headings with slug ids and collects them', () => {
  const { html, headings } = renderMarkdown('## Core Components\ntext');
  assert.match(html, /<h2 id="core-components">Core Components<\/h2>/);
  assert.deepEqual(headings, [{ level: 2, text: 'Core Components', slug: 'core-components' }]);
});

test('renders tables, links, mermaid fences, likec4 markers', () => {
  const md = '| A | src |\n|---|---|\n| x | observed |\n\n[adr](docs/adr/0001-sample.md)\n\n```mermaid\nerDiagram\n```\n\n<!-- likec4:view index -->';
  const { html } = renderMarkdown(md);
  assert.match(html, /<table>[\s\S]*<td>observed<\/td>/);
  assert.match(html, /<a href="docs\/adr\/0001-sample.md">adr<\/a>/);
  assert.match(html, /diagram-shell[\s\S]*mermaid-canvas/);
  assert.match(html, /<c4-view view-id="index">/);
});

test('strips frontmatter', () => {
  const { html } = renderMarkdown('---\nname: x\n---\n## T');
  assert.doesNotMatch(html, /name: x/);
});

test('makes repeated heading ids unique within a document', () => {
  const { html, headings } = renderMarkdown('## Consequences\n\n## Consequences');
  assert.match(html, /<h2 id="consequences">/);
  assert.match(html, /<h2 id="consequences-2">/);
  assert.deepEqual(headings.map((h) => h.slug), ['consequences', 'consequences-2']);
});

test('keeps heading ids unique across docs sharing a slug registry', () => {
  const seen = new Map();
  renderMarkdown('## Considered Options', seen);
  const { headings } = renderMarkdown('## Considered Options', seen);
  assert.equal(headings[0].slug, 'considered-options-2');
});

test('renders absolute-URL links with the href intact', () => {
  const { html } = renderMarkdown('[Stripe](https://stripe.com/docs/api)');
  assert.match(html, /<a href="https:\/\/stripe\.com\/docs\/api">Stripe<\/a>/);
});
