# Viewer — generation pipeline, mermaid rules, scope record

Read when generating or regenerating the viewer (after ARCHITECTURE.md,
companions, and the LikeC4 model all validate clean). Defines the exact
pipeline, the mermaid styling rules every diagram must follow, and what v1
deliberately does not ship.

## 1. Pipeline

Four steps, in order — each feeds the next:

1. **Generate the LikeC4 webcomponent bundle.**
   `npx likec4 gen webcomponent --webcomponent-prefix c4 --outfile <out> <dir>`
   — `--webcomponent-prefix c4` is **mandatory**. It pins the custom-element
   tag to `<c4-view>`, which the renderer emits and the viewer template
   expects. LikeC4's own default prefix is `likec4`; omitting the flag
   yields `<likec4-view>` instead, and every diagram renders blank with no
   error (`likec4.md` §3 covers the same fact for model generation).

2. **Obtain the mermaid + `@mermaid-js/layout-elk` ESM bundles.**
   `npm pack` (or a cache copy) each package, then read the built ESM file
   off disk — **never a CDN URL in the output**; the viewer must work fully
   offline. The bundle content is spliced into the template as inline
   `<script type="module">` text (`scripts/lib/embed.mjs`), not loaded as a
   separate file, so it must define **top-level `mermaid` and `elkLayouts`
   bindings** — plain values in that script's scope, not bare ESM `export`
   statements (which have nothing to bind to once inlined). The template's
   init line runs immediately after the splice point:
   ```js
   mermaid.registerLayoutLoaders(elkLayouts);
   mermaid.initialize({ theme: 'base', themeVariables: ..., layout: 'elk' });
   ```
   If the bundle doesn't expose `mermaid`/`elkLayouts` as bindings at that
   scope, this line throws a `ReferenceError` and the whole page fails to
   render — not just the diagrams.

3. **Render the pages.**
   ```
   node scripts/render.mjs \
     --root <target> \
     --arch <ARCHITECTURE.md> \
     --docs <companions+ADRs> \
     --out viewer/ \
     --likec4-bundle <path> \
     --mermaid-bundle <path> \
     --theme assets/mermaid-theme.json
   ```
   Renders ARCHITECTURE.md and every companion/ADR page to HTML, injects
   heading ids (for deep links), builds the sidebar nav, embeds all six
   template slots (`TITLE`, `NAV`, `DOC`, `LIKEC4_BUNDLE`, `MERMAID_BUNDLE`,
   `THEME`), and writes `viewer/index.html` — one self-contained file.

   The markdown subset is headings, fenced code, likec4 view markers, tables,
   **lists** (`scripts/lib/md-list.mjs` — bullet, numbered, and nested, with
   the child `<ul>` inside its parent `<li>`) and paragraphs, plus inline
   code/bold/link (`scripts/lib/md-inline.mjs`). Anything without a shape falls
   through to the paragraph collector, which joins consecutive lines — so an
   unsupported block does not fail loudly, it silently comes out as run-on
   prose. Add the shape to `shapeOf` before adding the renderer. Known gap:
   `*italic*` is not in the subset and reaches the page as literal asterisks.

   Two shapes are chosen by measurement rather than by syntax, because the same
   markdown means different things at different sizes:

   | Source | Rendered as | Rule |
   |---|---|---|
   | consecutive `likec4:view` markers | one tab group (`md-views.mjs`) | blank lines between them only — prose between makes them separate shells |
   | 2-column table, right column averaging >60 chars | definition card grid (`md-defs.mjs`) | `Term \| Definition` is a definition list; `Property \| Value` is data and stays a table |
   | ≥5-column table with ≤3 rows | one record card per row (`md-wide.mjs`) | a table's shape claims "read across these rows"; §9's eight columns describe one integration, so there is nothing to read across and every cell wraps to four lines in a 1/8th column. Both conditions, not either — a wide table with many rows is a real comparison |

   Every table is **full width**, capped at the column. Content width gave each
   one its own, so a page of them read as a ragged right edge against fixed
   prose; the cap still has to be there or a wide one pushes past the column
   instead of wrapping its cells.

   `--docs` order is the reading order and the rail order; the renderer never
   sorts. The rail's section label comes from each document's parent directory
   (`docs/adr/` → Decision Records), so passing ADRs interleaved with
   companions splits them into repeated sections.

   **Links are rewritten** (`scripts/lib/doc-links.mjs`) in a second pass, because
   a link's target id comes from the target's H1 and is only known once every
   document has been rendered. The viewer is a single file, so every relative
   href in it is dead on arrival — a real set has dozens.

   | Href | Becomes |
   |---|---|
   | relative path resolving to a document in the set | in-page anchor, fragment dropped |
   | any other relative path — `.c4`, a directory, `/site/root` | `.ext-ref` span, path kept in `title` |
   | `#anchor` | untouched |
   | `https:`, `mailto:`, `//host` | untouched |

   The test is "is this a relative path", not a list of extensions: a `.c4` model
   or a `docs/` directory can never be a document in the set, so it is exactly as
   dead as an unresolved `.md` and reads better as text. Fragments on document
   links are dropped rather than resolved — heading slugs are deduped across the
   whole set, so `#context` inside one ADR may have been minted as `context-7`.

   Unwrapping is also a cheap link check: anything that comes out as `.ext-ref`
   either lives outside the set or does not exist. In the EOS set it surfaced
   three ADRs that `docs/adr/README.md` indexes but the repository never had.

4. **Serve it.**
   `node scripts/serve.mjs viewer/` — a tiny static file server, no build
   step. Regenerating after a doc edit is: rerun step 3, refresh the
   browser tab (step 4's server needs no restart).

## 2. Mermaid rules

Verbatim from spec §7 — every mermaid diagram (§8 Data Stores ER, §12
Security DFD) follows all of these, no exceptions:

- `theme: 'base'` only — no other mermaid theme.
- `registerLayoutLoaders` is mandatory before `initialize` — the ELK layout
  loader must be registered explicitly, or mermaid silently falls back to
  dagre with no warning.
- **≤10–12 nodes per diagram.** Above that, use the hybrid pattern: split
  into a top-level diagram plus per-node detail diagrams, rather than one
  dense diagram.
- **Never** the native `C4Context` mermaid diagram type — LikeC4 owns
  architecture diagrams (§5, §7, §10); mermaid is for ER and DFD only.
- **Never** `color:` inside a `classDef` — it fights the theme's own text
  color and breaks dark/light switching.
- Fonts: IBM Plex Sans (body) + IBM Plex Mono (code), matching the viewer
  template's `--font-body`/`--font-mono`.
- Accent colors: an approved pair only — teal `#0f766e` + slate `#475569`, as
  shipped in `assets/mermaid-theme.json`. No violet-fuchsia accents.
- **Fills are solid, never semi-transparent.** They used to be 8-digit hex tints
  with a dark border and dark text, which looked nothing like the LikeC4 diagram
  three sections above: LikeC4 paints a solid fill with light text and there is
  no way to soften it. `opacity` reaches the node data but its renderer applies
  it only to compound groups, and a custom colour takes a single opaque hex —
  both confirmed against LikeC4's own DSL reference. So mermaid is the renderer
  that moves, and its element palette is LikeC4's derived triple exactly:

  | | fill | stroke | text |
  |---|---|---|---|
  | `brand` | `#0f766e` | `#00524b` | `#c7ffff` |
  | `muted` | `#475569` | `#263447` | `#e8f7ff` |

  LikeC4 derives stroke and both contrast shades from the one hex it is given;
  those derived values are recorded in the `likec4` block so mermaid can match
  them. Regenerate and re-check if a LikeC4 upgrade changes the derivation.
- **Elements are one palette across both modes; chrome is two.** A solid fill
  carries its own text colour, so it is legible either way — and LikeC4 does the
  same: sampled pixel-for-pixel its node fill is `#0f766e` in light *and* dark.
  So `themeVariables` holds the elements and nothing else. What flips is the
  chrome that sits *against* the canvas — subgraph panels, edge-label chips,
  prose ink — and that lives in a `light` block and a `dark` block, **merged
  over** `themeVariables` rather than swapping it:

  ```js
  Object.assign({}, t.themeVariables, isDark() ? t.dark : t.light)
  ```

  Both blocks state the **same keys**, enforced by a test. Holding only `dark` is
  what put black trust-boundary panels and near-black edge chips on a cream page
  while the LikeC4 diagram two sections above went properly pale.
- **The chrome hexes are measured off LikeC4, not invented.** LikeC4's own render
  was screenshotted in each mode and sampled pixel-for-pixel; the values are
  recorded under `likec4.light` / `likec4.dark`, and a test asserts the mermaid
  variables equal them:

  | LikeC4 role | mermaid variable | light | dark |
  |---|---|---|---|
  | compound group fill | `clusterBkg` | `#dae8e7` | `#102523` |
  | compound group stroke | `clusterBorder` | `#719591` | `#0c342f` |
  | compound group title | `titleColor` | `#19524e` | `#93cbc5` |

  Which variable paints which part was also found by rendering with marker
  colours, because mermaid's fallback chain is not what it looks like. In the
  ER and DFD subset:

  | painted thing | variable |
  |---|---|
  | subgraph fill / stroke / title | `clusterBkg` / `clusterBorder` / `titleColor` |
  | flowchart edge-label chip / its text | `edgeLabelBackground` / `primaryTextColor` |
  | ER relationship label box / its text | `tertiaryColor` at 0.5 alpha / `primaryTextColor` |

  `tertiaryTextColor`, `tertiaryBorderColor`, `relationLabelBackground`,
  `relationLabelColor` and `textColor` paint **nothing** here — they are fallbacks
  for keys now set explicitly, or for diagram types this subset does not use.
  Setting them looks like it works and changes nothing.
- **A relation label is a word on a line, and the viewer paints it, not mermaid.**
  Mermaid always draws a chip and locks its text to `primaryTextColor` — the light
  ink solid teal fills need — so every chip it can paint has to be dark to stay
  legible, which on a cream page is a dark blob. No theme variable can say "no
  chip". Mermaid's SVG is in the page's own DOM, unlike LikeC4's shadow root, so
  the viewer overrides it directly: `var(--surface)` behind, `var(--text)` in
  front, both already flipping with the theme.

  Surface rather than `transparent` because the label sits *on* the relation line
  — transparent lets the line strike through the text. And **all three layers**,
  because mermaid colours a different one per diagram type:

  | layer | painted in |
  |---|---|
  | `div.labelBkg` | ER relationship label |
  | `span.edgeLabel` | both |
  | `span.edgeLabel p` | flowchart edge label |

  Miss one and that diagram type keeps its blob. `!important` is required —
  mermaid injects its own rules into the SVG. This is why `edgeLabelBackground`
  is **absent** from the palette rather than tuned: a value there would be
  overridden and only look authoritative.
- **LikeC4's relation label needs the same treatment, through its shadow root.**
  It draws `div.likec4-edge-label` with a translucent dark background in *both*
  modes (`--xy-edge-label-background-color`, re-declared on
  `.likec4-edge-label-container` — so setting the variable on the host does not
  reach it). Left alone, §10 keeps a dark chip while §12 has lost one. The root is
  **open**, so `stripEdgeChips()` pushes a `<style>` inside, and because custom
  properties inherit across the boundary `var(--text)` flips with the toggle on
  its own. Two traps:

  | trap | why |
  |---|---|
  | `background: transparent`, not `var(--surface)` | LikeC4 breaks its edge line around the label, so nothing needs masking and an opaque chip is a white blob over a compound panel. Mermaid routes the line *through* its label and does need the mask. |
  | walk **every** nested root, and retry | the label is not in the root `c4-view` opens — a div in that root opens another, later. A shadow root cannot be observed into existence (MutationObserver does not cross the boundary), so the walk runs on a `[0, 200, 600, 1500, 3000]`ms ladder and again when the router reveals a page. |
- **`tertiaryColor` stays shared** across modes. Its only remaining consumer is
  the fallback layer for diagram types this subset does not use; the ER label box
  it used to paint (at 0.5 alpha) is now the viewer's.
- The `likec4` block is the palette **for both renderers**, consumed at different
  times — the part to keep straight:

  | | Hue | Light/dark |
  |---|---|---|
  | mermaid | read from the file at render time | re-render on toggle |
  | LikeC4 | baked into the bundle by `gen webcomponent` from the model's `specification` (`likec4.md` §2) | `color-scheme` attribute, set on toggle |

  So editing the file changes mermaid on the next render and LikeC4 only after
  the model's `specification` is updated to match and the bundle regenerated.
  A viewer-side CSS override is not an option: `--likec4-palette-fill` set on
  `c4-view` reaches the host and is re-declared closer to the node inside the
  shadow root, so the nodes keep whatever the bundle baked in.
- **Both renderers move on one toggle handler.** `syncDiagramTheme()` sets
  `color-scheme` on every `<c4-view>`; without it the toggle re-rendered mermaid
  and left every LikeC4 view in the mode it booted in — a light diagram on a
  dark page. Splitting the two across separate handlers is how they drifted
  apart in the first place.
- The renderer strips mermaid's intrinsic `width`/`height` off the SVG and
  scales it to the container via its `viewBox`. Mermaid otherwise pins a
  diagram to its natural size (~300px for the §8 ER), which is an unreadable
  thumbnail in a full-width shell. LikeC4 needs the opposite — an explicit
  box (`c4-view { height: 460px }`) to fit its view into.
- Every diagram — LikeC4 `<c4-view>` embeds and mermaid diagrams alike —
  gets all four controls: zoom, pan, expand, and **fullscreen**
  (`.diagram-shell` + `.diagram-toolbar` in the viewer template).

## 3. v1 scope record

Shipped: per-section and per-view deep links, dark/light toggle (persisted
in `localStorage`), and a **two-level** sidebar nav (`scripts/lib/nav.mjs`) with
a substring filter, scroll-spy active state, three-part breadcrumb, and an
off-canvas drawer below 960px.

Both levels are load-bearing, and the second one is the one that is easy to
skip. A real set runs to ~20 documents and ~120 headings:

| Rail | What the reader sees |
|---|---|
| flat headings | ~120 rows of near-duplicate labels — "Status", "Context", "Decision", "Consequences" repeat once per ADR with nothing saying which ADR a link belongs to |
| one group per document | 21 rows, 17 of them ADRs — the same wall one level up, and the four documents that are not ADRs are buried in it |
| section → document → heading | 2 rows closed. `Architecture` (4 docs) opens; `Decision Records` (17) stays collapsed until asked for |

Only the first section and its first document open on load. Scroll spy opens
whatever it lands on, at both levels; the filter force-opens hits and restores
the reader's own open/closed layout from `data-was-open` when the box clears.

### One column

Every block is the width of the reading measure or narrower — prose, tables,
code, diagrams, tab panels. Nothing breaks out.

Diagrams and wide tables used to take a 1080px track centred on the 689px prose
axis, which put their left edge ~190px outside the paragraph above them: the
reader re-found the margin on every block, and a 3x15 index needing 523px was
stretched to double its content for nothing. Three consequences worth stating:

- `table` is `width: max-content; max-width: 100%` — a small table hugs its
  content, a big one wraps its cells. Uncapped `max-content` never wraps, and 15
  of the 18 tables in a real set overran the column and grew their own sideways
  scrollbar. `th` cannot be `nowrap`: a header that refuses to wrap sets a floor
  the cap cannot beat.
- Two tables in that set (7–8 columns) still cannot fit and scroll inside their
  card. That is the floor of the design, not a bug to chase — the alternatives
  are wider prose for every document or restructuring the table.
- The measure is `min(96ch, calc(100vw - var(--rail-w) - 80px))`, not the classic
  74ch: once every table and diagram had to live inside the column, 74ch (689px)
  left 15 of 18 tables scrolling sideways. Widen this one value to trade reading
  comfort for table room. There is no narrow-desktop breakpoint — the `calc`
  gives up width to the rail before the cap ever binds.
- Block links (index rows, search hits, page-bar chips) must be named against
  `.main a`, which is (0,1,1) and beats a bare class. Otherwise each one grows
  the prose underline meant for links inside a sentence.
- A `<c4-view>` is fitted to its box **once**, when the element boots, and only
  refits on resize. The router reveals a section before the element is upgraded,
  so that first fit measures a box of zero and the view renders at its natural
  size, off the right edge of a 689px column. The template nudges it with a
  synthetic `resize` on `customElements.whenDefined('c4-view')`.

Scrollbars are styled once, globally (`scrollbar-width: thin` plus the
`::-webkit-scrollbar` rules), because a dozen scroll containers each showing a
15px platform slab is heavier than every hairline border in the page. The page
itself carries `overflow-x: clip` on `body` — set there rather than on `html` so
it propagates to the viewport without making `body` a clipping context, which
would trap the `position: fixed` expanded diagram.

### Page routes

**Every document is its own page** with its own route and its own reading
progress on the top bar (`scripts/lib/doc-routes.mjs`). A 21-document scroll is
not a page: the whole-set progress line barely moved while the reader worked
through one document.

Route slugs come from the **source filename**, not the H1 — a title gets
reworded, a filename is what every other document already links to. A section's
index page takes the section slug instead, so `#/decision-records` lands on the
list rather than on a file called `index`. Collisions get the same `-2` suffix
the heading-id registry uses (`slug-registry.mjs`).

| Hash | Meaning |
|---|---|
| `#/threat-model`, `#/0004-module-layout-vertical-slices-tenant-mixin` | that document |
| `#/decision-records` | the section's index page |
| `#page-doc-adr-0004`, `#12-security` | an element — the router opens whichever page contains it |

The second form is why nothing else had to change: every anchor the renderer
already writes is a bare element id, and so is every rail link.

`routeMap` is built once in `render.mjs` and passed to **both** `buildDoc` and
`buildNav`, so the body and the rail cannot disagree about which slug opens which
page. Both rail levels route on click: `preventDefault` stops the `<summary>`
toggle and the router owns which rows are open. A row cannot be collapsed over
the page on screen, because that would leave no way back into it.

The `Document 07` eyebrow and its hairline are gone. Both existed to separate one
document from the next in a single scroll, and a CSS counter cannot count pages
that are not in the layout — it read `Document 01` on every one. Each page's bar
carries `3 / 15` and prev/next across its section instead.

### Routed sections

Within a section, a shipped `index.md` or `README.md` makes it **routed**
(`scripts/lib/doc-sections.mjs`): the rail holds one row for the index, the index
holds the list, and one record shows at a time. Shipping an index is the opt-in —
there is no document-count threshold, because 15 records behind an index is a set
you browse while 15 records with no index is a run you read straight through.
The section holding the root architecture document never routes, or a 226-byte
`docs/architecture/README.md` would win the landing slot and hide
`ARCHITECTURE.md` behind a stub.

A record's bar gains a link back to the index; the index gets a status roll-up
and a search box.

**The index does not trust the author's own list.** `docs/adr/README.md` in the
EOS set indexes four records by filenames the repository never had — behind a
routed section that hid the other eleven completely, with one working link on the
page. So the index's links are resolved and counted against the records the
section actually holds, and when they fall short the viewer appends a generated
`Every record` list: position, title, status, one row each, all linked. When the
author's index does link every record (`docs/adr/index.md` does) nothing is
added.

**The search is not a nicety either.** Hiding
14 of 15 records puts them out of reach of the browser's own find, which is the
reason §3 records full-text search as unshipped. The records stay in the DOM, so
the index reads the same characters Ctrl+F would have — and can name the record
that matched instead of dropping the reader into an unlabelled slab. Statuses are
read from each record's own `## Status` section, falling back to an inline
`**Status:** …` label, and only the leading word is counted (a real status line
carries qualifiers: `Accepted — partially supersedes ADR-0008`).

Two consequences worth stating plainly: printing prints only the section on
screen (and only the open record inside a routed one), and a deep link into a
hidden section or record needs the router to reveal it before the scroll can land
— the browser jumps to the fragment first, so the jump is re-run after routing.

Deliberately **not** shipped, with reasons recorded here rather than left
silent:

| Feature | Status | Reason |
|---|---|---|
| Reach tracing | not shipped | LikeC4 covers this natively for its own architecture views — a second implementation would duplicate what LikeC4 already does |
| Semantic search | not shipped | the rail filter matches heading substrings, which covers wayfinding; ranking by meaning would need an index the offline single-file viewer has nowhere to put |
| Full-text body search | shipped for routed sections only | Ctrl/Cmd+F covers every document that is on screen, but a routed section hides all but one record, so its index carries its own search over the hidden bodies |

The honest-absence rule (`interview.md` §"Honest absence") applies to the
tool itself, not just to documentation facts: an unshipped feature is
recorded as unshipped, with why — never left for a reader to discover by
searching for something that isn't there.

## 4. Port

Default port is **4173**. `scripts/lib/port.mjs`'s `findFreePort` tries
4173 first and scans upward (4174, 4175, …) until it finds a free one —
never fails outright, never prompts to pick a port.
