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
- Accent colors: an approved pair only — teal `#0f766e` + slate `#475569`
  (as shipped in `assets/mermaid-theme.json`), semi-transparent 8-digit-hex
  fills. No violet-fuchsia accents.
- Every diagram — LikeC4 `<c4-view>` embeds and mermaid diagrams alike —
  gets all four controls: zoom, pan, expand, and **fullscreen**
  (`.diagram-shell` + `.diagram-toolbar` in the viewer template).

## 3. v1 scope record

Shipped: per-section and per-view deep links, dark/light toggle (persisted
in `localStorage`), responsive sidebar nav.

Deliberately **not** shipped, with reasons recorded here rather than left
silent:

| Feature | Status | Reason |
|---|---|---|
| Reach tracing | not shipped | LikeC4 covers this natively for its own architecture views — a second implementation would duplicate what LikeC4 already does |
| Semantic search | not shipped | v1 is a single page; the browser's built-in find (Ctrl/Cmd+F) is sufficient at this scale |

The honest-absence rule (`interview.md` §"Honest absence") applies to the
tool itself, not just to documentation facts: an unshipped feature is
recorded as unshipped, with why — never left for a reader to discover by
searching for something that isn't there.

## 4. Port

Default port is **4173**. `scripts/lib/port.mjs`'s `findFreePort` tries
4173 first and scans upward (4174, 4175, …) until it finds a free one —
never fails outright, never prompts to pick a port.
