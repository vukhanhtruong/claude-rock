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

test('a code block too wide for the column scrolls inside it', () => {
  // It used to break out to a 1080px track. A block wider than the prose above
  // it moves the left edge, and the reader re-finds it on every one.
  const pre = tpl.match(/\npre \{[\s\S]*?\}/)[0];
  assert.match(pre, /overflow:\s*auto/);
  assert.match(pre, /max-height:/);
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

// The toggle re-rendered mermaid and left LikeC4 in whichever mode it booted
// in, so dark mode showed a light diagram on a dark page. The webcomponent
// reads a color-scheme attribute; the viewer never set it.
test('the theme toggle reaches LikeC4, not just mermaid', () => {
  assert.match(tpl, /setAttribute\('color-scheme'/);
  assert.match(tpl, /querySelectorAll\('c4-view'\)/);
  // Both renderers move on one call, or they drift apart again the next time
  // somebody adds a third thing to the toggle.
  const toggle = tpl.match(/theme-toggle'\)\.addEventListener[\s\S]*?\n\}\);/)[0];
  assert.match(toggle, /syncDiagramTheme|applyTheme/);
});

// One file is the palette for both renderers: mermaid reads it at runtime,
// LikeC4 bakes it in at generate time. Leaving them in two places is how the
// diagrams drifted to teal and blue in the first place.
const theme = JSON.parse(readFileSync(new URL('../../assets/mermaid-theme.json', import.meta.url), 'utf8'));

// The two renderers were teal-on-pale and teal-on-solid: mermaid drew a light
// tinted fill with a dark border, LikeC4 a solid fill with light text. LikeC4's
// leaf fill cannot be softened — opacity reaches the node data but its renderer
// only applies it to compound groups — so mermaid is the one that moves.
test('mermaid fills match the exact hexes LikeC4 derives from the same brand', () => {
  assert.match(theme.likec4.brand, /^#[0-9a-f]{6}$/, 'brand is not a hex');
  assert.equal(theme.themeVariables.primaryColor, theme.likec4.brand);
  assert.equal(theme.themeVariables.primaryBorderColor, theme.likec4.brandStroke);
  assert.equal(theme.themeVariables.primaryTextColor, theme.likec4.brandText);
  assert.equal(theme.themeVariables.secondaryColor, theme.likec4.muted);
  assert.equal(theme.themeVariables.secondaryBorderColor, theme.likec4.mutedStroke);
});

// A solid fill carries its own text colour, so it is legible in either mode.
// LikeC4 proves the point: sampled pixel-for-pixel, its node fill is #0f766e in
// light AND dark — only the canvas behind it flips.
test('the element palette does not change between light and dark', () => {
  for (const key of ['primaryColor', 'primaryBorderColor', 'primaryTextColor',
    'secondaryColor', 'lineColor']) {
    assert.equal(theme.dark[key], undefined, `${key} must not be re-stated per mode`);
    assert.equal(theme.light[key], undefined, `${key} must not be re-stated per mode`);
  }
});

// Merged, not swapped: the mode block holds only what genuinely differs, so a
// shared value cannot be updated in one mode and forgotten in the other.
test('the mode palette is merged over the shared one', () => {
  assert.match(tpl, /Object\.assign\(\{\}, t\.themeVariables/);
  assert.match(tpl, /isDark\(\) \? t\.dark : t\.light/);
  assert.match(tpl, /ARCH_DOCS_THEME/);
  assert.match(tpl, /rerenderDiagrams\(\)/);
});

// A subgraph panel, an edge-label chip and the prose ink are chrome, not
// elements: they sit against the canvas, so they have to flip with it. Holding
// only one mode's values is what put black boundary panels on a cream page.
// Both blocks state the same keys, or the next palette edit lands in one mode
// and the other keeps a stale hex with nothing to flag it.
test('every chrome value is stated for both modes, never only one', () => {
  const l = Object.keys(theme.light).sort();
  const d = Object.keys(theme.dark).sort();
  assert.deepEqual(l, d, 'light and dark must state the same keys');
  assert.ok(l.length >= 4, 'the mode blocks look empty');
  for (const key of l) {
    assert.equal(theme.themeVariables[key], undefined,
      `${key} is per-mode, so a shared value for it only looks authoritative`);
    assert.notEqual(theme.light[key], theme.dark[key], `${key} is the same in both modes`);
  }
});

// The sync contract, measured rather than guessed: LikeC4's own render sampled
// pixel-for-pixel in each mode, and mermaid told to paint the same hex with the
// same chrome. Which mermaid variable paints which part was also found by
// rendering with marker colours — a subgraph takes clusterBkg/clusterBorder and
// its title takes titleColor, none of which fall back to the tertiary trio once
// they are set.
test('mermaid chrome matches the hexes LikeC4 paints in the same mode', () => {
  const map = {
    clusterBkg: 'groupFill',
    clusterBorder: 'groupStroke',
    titleColor: 'groupText',
  };
  for (const mode of ['light', 'dark']) {
    for (const [mermaidVar, likec4Role] of Object.entries(map)) {
      assert.equal(theme[mode][mermaidVar], theme.likec4[mode][likec4Role],
        `${mode} ${mermaidVar} does not match LikeC4's ${likec4Role}`);
    }
  }
});

// WCAG relative luminance and contrast ratio. Diagram text is baked into the
// SVG, so an unreadable pairing cannot be fixed by the reader or by the theme
// toggle — it has to be caught here.
const lum = (h) => {
  const ch = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('every diagram text pairing clears the WCAG AA ratio', () => {
  const v = theme.themeVariables;
  const pairs = [
    ['entity name on its fill', v.primaryColor, v.primaryTextColor],
    ['secondary node label', v.secondaryColor, v.secondaryTextColor],
  ];
  // The chrome pairings are per mode, and a ratio that only holds in one of them
  // is the bug this pass exists to close.
  for (const mode of ['light', 'dark']) {
    const m = theme[mode];
    pairs.push([`${mode} DFD boundary title on its panel`, m.clusterBkg, m.titleColor]);
  }
  for (const [what, bg, fg] of pairs) {
    const ratio = contrast(bg, fg);
    assert.ok(ratio >= 4.5, `${what}: ${fg} on ${bg} is only ${ratio.toFixed(2)}:1`);
  }
});

// A relation label ("owns", "HTTPS + session cookie") is a word on a line, not a
// component, and no mermaid variable can say that: the label text is locked to
// primaryTextColor — the light ink solid teal fills need — so any chip mermaid
// paints has to be dark to stay legible, which on a cream page is a dark blob.
// Mermaid's SVG is in the page's own DOM, not a shadow root, so the viewer takes
// the label back instead: page surface behind it, page ink in front, both already
// flipping with the theme. That leaves no per-mode hex to state, which is why
// edgeLabelBackground is gone from the palette rather than tuned.
test('the viewer, not mermaid, paints the relation label', () => {
  const rule = tpl.match(/\n\.diagram-canvas \.labelBkg,[\s\S]*?\n\}/)[0];
  assert.match(rule, /background-color:\s*var\(--surface\)\s*!important/);
  assert.match(rule, /color:\s*var\(--text\)\s*!important/);
  // Per diagram type mermaid colours a different layer: the ER label its
  // wrapping div, the flowchart label the innermost <p>. Missing one leaves that
  // diagram type with a chip nothing else has.
  for (const layer of [/\.labelBkg/, /span\.edgeLabel,/, /span\.edgeLabel p/]) {
    assert.match(rule, layer, 'a label layer mermaid paints is not covered');
  }
  for (const block of ['themeVariables', 'light', 'dark']) {
    assert.equal(theme[block].edgeLabelBackground, undefined,
      `edgeLabelBackground in ${block} is overridden by the viewer, so it only misleads`);
  }
});

// The same label, the other renderer. LikeC4 draws its relation label as
// div.likec4-edge-label inside a nested — but open — shadow root, so page CSS
// cannot select it and the chip survived while every mermaid label lost one:
// §10 stayed a dark blob on a cream page next to a §12 that did not. A style
// element pushed into the shadow root reaches it, and because custom properties
// inherit across the shadow boundary the same var() flips with the toggle
// without re-injecting anything.
test('the relation label loses its chip in LikeC4 too, not just mermaid', () => {
  const css = tpl.match(/var CHIP_CSS =[\s\S]*?;\n/)[0];
  assert.match(css, /\.likec4-edge-label/);
  assert.match(css, /color:var\(--text\) !important/);
  // transparent, not var(--surface) like the mermaid rule: LikeC4 breaks its edge
  // line around the label, so an opaque chip is a white blob over a compound
  // panel and masks nothing that needed masking.
  assert.match(css, /background:transparent !important/);

  const fn = tpl.match(/function stripEdgeChips[\s\S]*?\n\}\n/)[0];
  // Nested roots: the label is not in the root c4-view opens, and the inner one
  // is opened later, so descending only once silently reaches nothing.
  assert.match(fn, /walk\(el\.shadowRoot\)/);
  assert.match(tpl, /\[0, 200, 600, 1500, 3000\][\s\S]*?pinEdgeChips/,
    'a shadow root cannot be observed into existence, so the walk has to retry');
  assert.match(tpl, /pinEdgeChips/, 'the helper is never called');
});

// No fill may be semi-transparent any more. An 8-digit hex was how the old
// tinted fills were built, and it is exactly what LikeC4 cannot reproduce.
test('no fill is semi-transparent, because LikeC4 has no way to match one', () => {
  const alpha = Object.entries(theme.themeVariables)
    .filter(([, v]) => typeof v === 'string' && /^#[0-9a-f]{8}$/i.test(v));
  assert.deepEqual(alpha, [], '8-digit hex fills cannot be matched by LikeC4');
});

/* ---------- one column ---------- */

// Diagrams and wide tables took a 1080px track centred on a 689px prose column,
// so every one of them started ~190px to the left of the paragraph above it.
// One column for everything: a block may be narrower than the measure, never
// wider, and every block shares the same left edge.
test('nothing breaks out of the content column', () => {
  assert.doesNotMatch(tpl, /var\(--wide\)/);
  assert.doesNotMatch(tpl, /--measure-wide/);
  assert.doesNotMatch(tpl, /is-wide/);
  assert.doesNotMatch(tpl, /sizeTables|sizeCode/);
});

// Content-width made every narrow table a different width, so a page of them read
// as a ragged right edge against a fixed prose column. One width for all of them.
test('a table fills the column rather than hugging its content', () => {
  const rule = tpl.match(/\n\.table-wrap \{[^}]*\}/)[0];
  assert.match(rule, /width:\s*100%/);
  assert.doesNotMatch(rule, /max-content/, 'content width is what made them ragged');
  assert.match(tpl, /\.table-scroll \{[^}]*overflow-x:\s*auto/);
});

// Full width is a floor as well as a ceiling, so the cap still has to be there:
// without it a wide table pushes past the column instead of wrapping its cells,
// and 15 of the 18 tables in a real set grew a sideways scrollbar inside a
// vertical read.
test('a table too wide for the column wraps rather than scrolling sideways', () => {
  const rule = tpl.match(/\ntable \{[\s\S]*?\}/)[0];
  assert.match(rule, /width:\s*100%/);
  assert.match(rule, /max-width:\s*100%/);
  assert.doesNotMatch(rule, /max-content/);
  const th = tpl.match(/\nth \{[\s\S]*?\}/)[0];
  assert.doesNotMatch(th, /white-space:\s*nowrap/, 'a nowrap header sets a floor the cap cannot beat');
  const td = tpl.match(/\ntd \{[\s\S]*?\}/)[0];
  // Seven columns in an 891px measure is ~110px each, narrower than the words in
  // them. `overflow-wrap: anywhere` does remove the resulting scroll — it is the
  // only value min-content sizing reads — but it breaks every cell mid-word, and
  // a table nobody can read is worse than one that scrolls. A tighter scale buys
  // the columns real width instead.
  assert.doesNotMatch(td, /overflow-wrap:\s*anywhere/, 'anywhere breaks cells mid-word');
  assert.match(tpl, /\.table--wide \{[^}]*font-size:\s*12px/);
  assert.match(tpl, /\.table--wide :is\(th, td\) \{[^}]*padding/);
});

// LikeC4 fits a view once, at boot, against whatever box it has then. The
// router reveals a section before the element is upgraded, so that box is zero
// and the view renders at its natural size — off the edge of a 689px column.
test('a diagram is refit once its webcomponent boots', () => {
  assert.match(tpl, /whenDefined\('c4-view'\)/);
  assert.match(tpl, /new Event\('resize'\)/);
});

test('a diagram is the width of the column, not of the viewport', () => {
  const rule = tpl.match(/\n\.diagram-shell \{[\s\S]*?\}/)[0];
  assert.doesNotMatch(rule, /margin-left/);
  assert.doesNotMatch(rule, /width:/);
});

/* ---------- scrollbars ---------- */

// The platform default is a ~15px grey slab. Inside a code block or a table
// card that is an object wider than the hairline border around it, and there
// are a dozen of them in a real set.
test('every scroll container in the page gets the same thin scrollbar', () => {
  assert.match(tpl, /scrollbar-width:\s*thin/);
  assert.match(tpl, /scrollbar-color:/);
  const bar = tpl.match(/\n::-webkit-scrollbar \{[^}]*\}/)[0];
  assert.match(bar, /width:\s*\d+px/);
  assert.match(bar, /height:\s*\d+px/, 'a horizontal bar needs a height, not a width');
  assert.match(tpl, /::-webkit-scrollbar-thumb \{[^}]*border-radius/);
});

test('the rail does not carry a second, different scrollbar', () => {
  assert.doesNotMatch(tpl, /\.rail-scroll::-webkit-scrollbar/);
});

test('the page itself never scrolls sideways', () => {
  assert.match(tpl, /\nbody \{[\s\S]*?overflow-x:\s*clip/);
});

// overflow-x: auto computes the other axis from visible to auto, so the tab bar
// grew a vertical scrollbar for the 5px its tabs' hit areas stuck out of it.
test('the view tab bar cannot grow a scrollbar across its short axis', () => {
  const bar = tpl.match(/\.view-tabs__bar \{[\s\S]*?\}/)[0];
  assert.match(bar, /overflow-y:\s*hidden/);
});

test('a tab hit area fits inside the bar that holds it', () => {
  const pad = Number(tpl.match(/\.view-tabs__bar \{[\s\S]*?padding:\s*(\d+)px/)[1]);
  const reach = Number(tpl.match(/\.view-tab::after \{[^}]*inset:\s*-(\d+)px/)[1]);
  assert.equal(reach, pad, 'a hit area larger than the padding overflows the bar');
});

/* ---------- page routes ---------- */

// A 21-document scroll is not a page. Every document is its own page with its
// own route and its own progress: #/threat-model is the threat model, not an
// offset into a scroll that also holds twenty other documents.
test('one page is in the layout at a time, addressed by its own route', () => {
  assert.match(tpl, /\.page\[hidden\] \{[^}]*display:\s*none/);
  assert.match(tpl, /querySelectorAll\('\.page\[data-route\]'\)/);
  assert.match(tpl, /'#\/'/);
});

test('a bare element id still resolves to the page that holds it', () => {
  // Every in-page anchor the renderer writes is a bare id, and so is every rail
  // link. Routing must not require rewriting them.
  assert.match(tpl, /closest\('\.page'\)/);
});

test('the wider column is not the old prose measure', () => {
  const width = Number(tpl.match(/--measure:\s*min\((\d+)ch/)[1]);
  assert.ok(width >= 90, `${width}ch is still the narrow column`);
});

test('the top bar shows the progress of the open section, not of the whole set', () => {
  const js = tpl.match(/---- reading progress ----[\s\S]*?passive: true \}\)/)[0];
  assert.doesNotMatch(js, /document\.body\.scrollHeight/);
  assert.match(js, /getBoundingClientRect/);
  assert.match(tpl, /id="route-pos"/);
  assert.match(tpl, /\.route-pos \{[^}]*tabular-nums/);
});

// A section shorter than the viewport has nothing to scroll, and "100%" on a
// page the reader has not touched reads as a bug rather than as a fact.
test('the readout is blank when the whole section already fits on screen', () => {
  assert.match(tpl, /routePos\.textContent = span > 0 \?/);
});

test('the progress line sits on the top bar rather than above it', () => {
  assert.match(tpl, /#progress \{[^}]*top:\s*calc\(var\(--topbar-h\)/);
});

// A CSS counter cannot count pages that are not in the layout: with one
// document on screen the band read "Document 01" on every one of them. The bar
// carries "2 / 5", which is the thing the number was standing in for.
test('the document band is gone and the bar carries the position', () => {
  assert.doesNotMatch(tpl, /counter-increment/);
  assert.doesNotMatch(tpl, /counter\(doc/);
  assert.match(tpl, /\.page-pos \{[^}]*tabular-nums/);
});

// `.main a` is (0,1,1) and beats a bare class, so a row, a hit and a chip all
// grew the prose underline meant for links inside a sentence.
test('block links are not underlined like words in a sentence', () => {
  const rule = tpl.match(/\.main :is\([^)]*\.record-row[^)]*\) \{[^}]*\}/)[0];
  assert.match(rule, /\.page-chip/);
  assert.match(rule, /text-decoration:\s*none/);
});

test('every page gets a position and prev/next across its own section', () => {
  assert.match(tpl, /page-bar/);
  assert.match(tpl, /data-prev/);
  assert.match(tpl, /data-next/);
});

test('the rail routes from both levels instead of only toggling', () => {
  assert.match(tpl, /data-route/);
  assert.match(tpl, /nav-sec__head'\)/);
  assert.match(tpl, /nav-group__head'\)/);
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

test('a section with an index is browsed from it', () => {
  assert.match(tpl, /querySelectorAll\('\.doc-section\[data-routed\]'\)/);
  assert.match(tpl, /dataset\.landing/);
});

test('the router reads and writes the hash so deep links survive', () => {
  assert.match(tpl, /hashchange/);
  assert.match(tpl, /location\.hash/);
});

test('a record inside an indexed section also gets a link back to the index', () => {
  assert.match(tpl, /data-back/);
  assert.match(tpl, /'\u2039 All records'/);
});

// The author's own index is prose and goes stale. This set's docs/adr/README.md
// lists four records by filenames the repository never had; behind a routed
// section that hid the other eleven completely. So it is counted, not assumed.
test('the index lists every record when the author list does not', () => {
  assert.match(tpl, /record-list/);
  assert.match(tpl, /linksAll/);
});

// Hiding 15 of 17 documents breaks Ctrl+F across them. The text is still in the
// DOM, so the index searches it directly and names the record that matched.
test('the index searches the bodies of the records it hides', () => {
  assert.match(tpl, /record-search/);
  assert.match(tpl, /record-hits/);
});

test('a deep link into a hidden record opens it before scrolling', () => {
  assert.match(tpl, /showPage/);
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
test('landing on a page scrolls to the page, not past its bar', () => {
  assert.match(tpl, /\.page \{[^}]*scroll-margin-top/);
  assert.match(tpl, /classList\.contains\('doc-head'\)/);
});

// One record in a real set writes "**Status:** Accepted" as an inline label in
// its header block instead of under a Status heading. Both conventions count.
test('the status total reads an inline Status label as well as a heading', () => {
  assert.match(tpl, /Status:\\s\*\(\[A-Za-z\]\+\)|Status:\\s\*/);
});
