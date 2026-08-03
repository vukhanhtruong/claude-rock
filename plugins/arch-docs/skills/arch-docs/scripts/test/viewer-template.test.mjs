import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { embed } from '../lib/embed.mjs';

const tpl = readFileSync(new URL('../../assets/viewer-template.html', import.meta.url), 'utf8');

test('template has exactly the six slots and no external URLs', () => {
  const markers = [...tpl.matchAll(/<!-- slot:(\w+) -->/g)].map((m) => m[1]).sort();
  assert.deepEqual(markers, ['DOC', 'LIKEC4_BUNDLE', 'MERMAID_BUNDLE', 'NAV', 'THEME', 'TITLE']);
  assert.doesNotMatch(tpl, /https?:\/\/(?!www\.w3\.org)/);
});

test('template embeds cleanly and keeps required controls', () => {
  const out = embed({ template: tpl, slots: {
    TITLE: 't', NAV: '<a href="#x">x</a>', DOC: '<h2 id="x">x</h2>',
    LIKEC4_BUNDLE: '/*l*/', MERMAID_BUNDLE: '/*m*/', THEME: '{"themeVariables":{}}',
  } });
  for (const control of ['data-zoom-in', 'data-zoom-out', 'data-zoom-reset', 'data-expand', 'data-fullscreen']) {
    assert.match(out, new RegExp(control));
  }
  assert.match(out, /registerLayoutLoaders/);
  assert.match(out, /theme:\s*'base'/);
});

test('the rail is a labelled landmark with a filter and a mobile toggle', () => {
  assert.match(tpl, /<nav[^>]*class="[^"]*sidebar[^"]*"[^>]*aria-label=/);
  assert.match(tpl, /id="nav-filter"/);
  assert.match(tpl, /id="nav-toggle"/);
  assert.match(tpl, /aria-expanded=/);
});

test('the rail tracks the reader with scroll spy over grouped links', () => {
  assert.match(tpl, /IntersectionObserver/);
  assert.match(tpl, /is-active/);
  assert.match(tpl, /nav-group/);
});

test('the rail styles and scripts a section level above the document groups', () => {
  assert.match(tpl, /\.nav-sec__head\s*\{/);
  assert.match(tpl, /\.nav-sec\[open\]/);
  // The filter and the scroll spy both have to reach through the section, or a
  // hit inside a collapsed Decision Records block is invisible.
  assert.match(tpl, /sections\s*=\s*\[\]\.slice\.call\(document\.querySelectorAll\('\.nav-sec'\)\)/);
  assert.match(tpl, /closest\('\.nav-sec'\)/);
});

test('live counts use tabular figures so filtering does not jiggle the rail', () => {
  const counts = tpl.match(/\.nav-sec__count,\s*\.nav-group__count \{[\s\S]*?\}/)[0];
  assert.match(counts, /font-variant-numeric:\s*tabular-nums/);
});

test('icon buttons carry a 40px hit area without overlapping each other', () => {
  const hit = tpl.match(/\.icon-btn::after \{[\s\S]*?\}/)[0];
  assert.match(hit, /inset:\s*-(\d+)px/);
  assert.match(tpl, /\.icon-btn:active \{[^}]*scale:\s*\.96/);
});

test('the theme icons cross-fade instead of popping via display', () => {
  assert.doesNotMatch(tpl, /\.i-sun \{ display: none; \}/);
  assert.match(tpl, /filter:\s*blur\(4px\)/);
  assert.match(tpl, /cubic-bezier\(\.2, 0, 0, 1\)/);
});

test('layout is responsive and honours reduced motion', () => {
  assert.match(tpl, /@media\s*\(max-width:/);
  assert.match(tpl, /prefers-reduced-motion/);
});

test('long-form reading defaults are set on the content column', () => {
  assert.match(tpl, /--measure:/);
  assert.match(tpl, /scroll-margin-top:/);
});

test('code blocks keep their own line breaks so tree connectors stay aligned', () => {
  const pre = tpl.match(/\npre \{[\s\S]*?\}/)[0];
  assert.match(pre, /white-space:\s*pre\s*;/);
  assert.doesNotMatch(pre, /pre-wrap/);
  assert.doesNotMatch(pre, /word-break/);
  assert.match(pre, /overflow:\s*auto/);
});

const bodyRule = tpl.match(/\nbody \{[\s\S]*?\n\}/)[0];
const num = (src, prop) => Number(src.match(new RegExp(`${prop}:\\s*([\\d.]+)`))[1]);

test('sub-headings outrank body text so a long document keeps its structure', () => {
  // h3 was 16px against 16.5px body: sub-sections read as bold paragraphs, and
  // a 21-document scroll loses its second level entirely.
  const h3 = num(tpl.match(/\.main h3 \{[\s\S]*?\}/)[0], 'font-size');
  assert.ok(h3 > num(bodyRule, 'font-size'), `h3 ${h3}px must outrank body text`);
});

test('paragraphs are separated by at least a full line', () => {
  const gap = Number(tpl.match(/\.main p \{[\s\S]*?margin:\s*0 0 ([\d.]+)px/)[1]);
  const line = num(bodyRule, 'font-size') * num(bodyRule, 'line-height');
  assert.ok(gap >= line * 0.8, `${gap}px gap is short against a ${line.toFixed(1)}px line`);
});

test('headings balance their line breaks', () => {
  assert.match(tpl, /\.main :is\(h2, h3\) \{[^}]*text-wrap: balance/);
});

test('a code block too wide for the prose column breaks out of it', () => {
  // Prose sits at ~74ch of 16.5px sans; code renders at 12.8px mono. Trees and
  // config blocks overrun that column and would scroll inside a narrow box.
  assert.match(tpl, /scrollWidth > /);
  assert.match(tpl, /pre\.is-wide/);
});

test('inline code inside a heading drops the chip it wears in prose', () => {
  // A .855em chip on a clamp(30px, 3.4vw, 43px) display heading is a 37px grey
  // box that outweighs the words around it.
  const rule = tpl.match(/:is\(\.doc-head, \.main h2, \.main h3\) code \{[\s\S]*?\}/)[0];
  assert.match(rule, /background:\s*none/);
  assert.match(rule, /padding:\s*0/);
});

test('a deep-linked heading marks where the reader landed', () => {
  assert.match(tpl, /:target/);
});

test('table figures line up down their column', () => {
  assert.match(tpl, /\ntd \{[^}]*tabular-nums/);
});

test('diagram controls are icon buttons with accessible names', () => {
  assert.match(tpl, /aria-label="Zoom in"/);
  assert.match(tpl, /aria-label="Fullscreen"/);
  assert.doesNotMatch(tpl, />Exp</);
});

test('mermaid theme json parses and bans color in classDefs', () => {
  const theme = JSON.parse(readFileSync(new URL('../../assets/mermaid-theme.json', import.meta.url), 'utf8'));
  assert.ok(theme.themeVariables.fontFamily.includes('IBM Plex'));
  assert.doesNotMatch(JSON.stringify(theme), /"color"/);
});

test('mermaid ships a dark palette and the viewer re-renders on theme change', () => {
  const theme = JSON.parse(readFileSync(new URL('../../assets/mermaid-theme.json', import.meta.url), 'utf8'));
  // Diagram text is baked in at render time, so one fixed palette leaves labels
  // unreadable in whichever mode it was not chosen for.
  for (const key of ['primaryTextColor', 'lineColor', 'edgeLabelBackground']) {
    assert.ok(theme.dark[key], `dark palette missing ${key}`);
    assert.ok(theme.themeVariables[key], `light palette missing ${key}`);
    assert.notEqual(theme.dark[key], theme.themeVariables[key]);
  }
  assert.match(tpl, /ARCH_DOCS_THEME/);
  assert.match(tpl, /\.dark\b/);
  assert.match(tpl, /rerenderDiagrams\(\)/);
});
