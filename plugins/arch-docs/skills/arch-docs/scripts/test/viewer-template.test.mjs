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

/* ---------- conditional table width ---------- */

// Every table took the 1068px wide track, so a 3x15 index needing 523px was
// stretched to double its content for zero gain. The wide track is now opt-in,
// measured the same way code blocks are.
test('a table sizes to its content instead of stretching to fill', () => {
  const rule = tpl.match(/\ntable \{[^}]*\}/)[0];
  assert.match(rule, /width:\s*max-content/);
  assert.doesNotMatch(rule, /width:\s*100%/);
});

test('the wide track is opt-in for tables, not unconditional', () => {
  const [, selector] = tpl.match(/\n([^\n{]*)\{[^}]*width:\s*var\(--wide\);/);
  assert.doesNotMatch(selector, /\.table-wrap/, 'table-wrap must not take the track by default');
  assert.match(tpl, /\.table-wrap\.is-wide \{[^}]*var\(--wide\)/);
});

test('table width is decided by measuring natural content width', () => {
  assert.match(tpl, /sizeTables/);
  assert.match(tpl, /max-content/);
  assert.match(tpl, /classList\.toggle\('is-wide'/);
});

/* ---------- view tabs ---------- */

test('view tab groups are styled and only the selected panel shows', () => {
  assert.match(tpl, /\.view-tabs \{/);
  assert.match(tpl, /\.view-tab\[aria-selected="true"\]/);
  assert.match(tpl, /\.view-panel\[hidden\] \{[^}]*display:\s*none/);
});

test('clicking a view tab swaps the panel and moves selection', () => {
  assert.match(tpl, /querySelectorAll\('\.view-tabs'\)/);
  assert.match(tpl, /ArrowRight/, 'tablist must be keyboard navigable');
});

/* ---------- definition grids and dead references ---------- */

test('definition grids lay out as a grid, not a stack of rows', () => {
  const rule = tpl.match(/\n\.def-grid \{[^}]*\}/)[0];
  assert.match(rule, /display:\s*grid/);
  assert.match(rule, /repeat\(auto-fill/);
});

test('a definition term outranks its body without being a heading', () => {
  assert.match(tpl, /\.def dt \{/);
  assert.match(tpl, /\.def dd \{/);
});

// A reference the viewer does not contain is rendered as text, so it must not
// borrow the link colour — that is the whole point of unwrapping it.
test('an external reference is visually distinct from a live link', () => {
  const rule = tpl.match(/\n\.ext-ref \{[^}]*\}/)[0];
  assert.doesNotMatch(rule, /var\(--accent\)/);
  assert.match(rule, /var\(--font-mono\)/);
});

/* ---------- routed sections ---------- */

test('a routed section shows one page at a time', () => {
  assert.match(tpl, /\.doc-section\[data-routed\] \.page\[hidden\] \{[^}]*display:\s*none/);
  assert.match(tpl, /querySelectorAll\('\.doc-section\[data-routed\]'\)/);
});

test('the router reads and writes the hash so deep links survive', () => {
  assert.match(tpl, /hashchange/);
  assert.match(tpl, /location\.hash/);
});

test('a routed record gets a back link and prev/next between siblings', () => {
  assert.match(tpl, /record-bar/);
  assert.match(tpl, /data-prev/);
  assert.match(tpl, /data-next/);
});

// Hiding 15 of 17 documents breaks Ctrl+F across them. The text is still in the
// DOM, so the index searches it directly and names the record that matched.
test('the index searches the bodies of the records it hides', () => {
  assert.match(tpl, /record-search/);
  assert.match(tpl, /record-hits/);
});

test('a deep link into a hidden record opens it before scrolling', () => {
  assert.match(tpl, /routeTo/);
  assert.match(tpl, /scrollIntoView|scrollTo/);
});

// "One index page with comprehensive information" — a list of titles is not
// comprehensive. Each record states its own status under a Status heading, so
// the index can total them without the renderer parsing anything.
test('the index totals the statuses of the records it lists', () => {
  assert.match(tpl, /record-summary/);
  assert.match(tpl, /statusOf/);
  assert.match(tpl, /'status'/);
});

test('the search box goes after the index prose, not between it and the title', () => {
  assert.match(tpl, /tagName === 'P'/);
});

// The record bar sits above the record's title, so scrolling to the title
// itself puts the bar off screen and the reader loses prev/next.
test('landing on a record scrolls to the record, not past its bar', () => {
  assert.match(tpl, /\.doc-section\[data-routed\] \.page \{[^}]*scroll-margin-top/);
  assert.match(tpl, /classList\.contains\('doc-head'\)/);
});

// One record in a real set writes "**Status:** Accepted" as an inline label in
// its header block instead of under a Status heading. Both conventions count.
test('the status total reads an inline Status label as well as a heading', () => {
  assert.match(tpl, /Status:\\s\*\(\[A-Za-z\]\+\)|Status:\\s\*/);
});
