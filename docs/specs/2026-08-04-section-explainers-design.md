# Section Explainers in the Viewer — Design

**Date:** 2026-08-04
**Status:** Draft

## Goal

Every architecture section shown in the viewer should be able to explain itself.
A reader who lands on §9 External Integrations and does not know what belongs
there has no way to find out from the document — the section explains the
*system*, never the *section*.

`docs.arc42.org` solves this by heading each chapter with a fixed explanation
(*Contents / Motivation / Form / Further Information*). This design brings the
same affordance into the generated viewer: a `[?]` button beside each section
heading that toggles a short explainer open in place.

The explainers are guidance about the template, not claims about the documented
system, so they sit outside the `observed / stated / researched / proposed`
provenance rules entirely. Nothing in this feature can make an invented fact
look verified.

## Decisions

| Decision | Choice |
|---|---|
| Interaction | Click-toggled inline `<details>` under the heading |
| Rejected | Hover tooltip; modal popup |
| Scope | 16 spine sections + 3 elected companion docs (19 explainers) |
| Out of scope | interface-contract, ADRs, `CONTEXT.md`, `CONTEXT-MAP.md` |
| Lookup key | Canonical heading text, **not** the heading slug |
| Text source | Written in our own words, preserving arc42's meaning |
| Text home | `assets/section-help.json`, embedded via a new slot |
| Injection | Client-side, extending the existing heading-decoration loop |

### Why inline `<details>`, not hover

- **Content is too large for hover.** An explainer covering arc42's four fields
  runs 80–150 words. A hover panel that size follows the cursor and obscures
  the section it describes. Native `title=` is worse still: delayed,
  unstyleable, single-line, truncating.
- **Hover excludes touch and keyboard.** `viewer-template.html` carries no
  `@media (hover: hover)` or `pointer: coarse` guard anywhere, while its
  responsive breakpoints and mobile rail make touch a supported target. A
  hover-only affordance would introduce a failure class the viewer does not
  currently have.
- **A modal is the wrong shape.** `.drawer` + `.drawer-scrim` is `aria-modal`:
  it dims the page and takes focus, because an ADR is read *instead of* the row
  that cited it. A section explainer is read *alongside* its section; a modal
  forces dismissal before the guidance can be applied.
- **`<details>` matches the house idiom.** `nav.mjs` already runs
  `<details>`/`<summary>` two levels deep. Reusing it buys keyboard support,
  touch support, and Chrome's find-in-page traversal for free, needs no JS
  state machine, and adds no Escape wiring — `viewer-template.html` handles
  Escape once for the whole page by deliberate design.

### Why the lookup keys on heading text, not slug

Two independent hazards make the slug an unsafe key:

1. `slugify` in `validate-links.mjs` strips `&` but keeps both surrounding
   spaces, so `"Goals & Scope"` becomes `goals--scope` with a double hyphen.
   Four of the 16 spine headings contain `&`.
2. `h2` and `h3` ids share a single dedupe registry across all documents
   (`render.mjs`). §11 Crosscutting Concepts legitimately contains auth
   subheadings, so an `h3` named "Security" there would claim `security` and
   silently demote §12's `h2` to `security-2`.

`references/writing.md` states the spine headings never change. That makes the
heading text a stronger and more stable key than any derived slug, and immune
to both hazards.

### Why ADRs are out of scope

§14 Decisions is itself one of the 16 spine sections, so it already receives an
explainer, and that is where "what an ADR is, and why Considered Options is
mandatory here" belongs. A per-ADR explainer would be the same guidance a
second time, repeated across 17+ records.

`doc-sections.mjs` already made this call for the rail: the Decision Records
section is omitted because §14 tables every ADR, and a record opens *over* the
page that referenced it rather than replacing it. That page is §14 — so a
reader opening any ADR by deep link had the explainer in front of them one
click earlier.

`CONTEXT.md` and `CONTEXT-MAP.md` are excluded by the same reasoning plus
ownership: they are mattpocock's formats, documented by mattpocock.

### Why interface-contract is excluded

`electedDocs` frontmatter entries are `{ name, elected, reason? }` and carry no
path, so mapping a companion name to a file needs filename matching.
`threat-model.md`, `estimation.md` and `DOMAIN-OVERVIEW.md` have fixed
basenames. The interface contract does not — it is OpenAPI, tool schemas, data
contracts, or a wire protocol depending on the stack — and if it ships as raw
`.yaml` or `.proto` it never passes through `renderMarkdown` and so is not in
the viewer to annotate. Excluded rather than guessed at.

## Content

19 explainers, three fields each, compressing arc42's structure:

| Field | Corresponds to | Notes |
|---|---|---|
| `what` | arc42 *Contents* | What belongs in this section |
| `why` | arc42 *Motivation* | What goes wrong when it is missing |
| `good` | arc42 *Form* | Stated as a concrete test, not a format rule |

Written in our own words. The arc42 template text is CC BY-SA 4.0 (Starke &
Hruschka); copying its wording verbatim would attach share-alike obligations to
every document set the viewer emits, which is a licensing decision for our
users rather than ours to make on their behalf. Meaning is preserved; wording
is not borrowed.

**No arc42 link, and no `arc42` field.** arc42's fourth heading — *Further
Information* — has no equivalent here, because the viewer cannot carry an
outbound URL. Both `scripts/test/viewer-template.test.mjs` and
`scripts/test/render.test.mjs` assert `doesNotMatch(..., /https?:\/\/(?!www\.w3\.org)/)`,
the second against the **generated HTML**, so a link cannot live in the template
or in the content asset. The constraint is older and broader than this feature,
so the feature gives way: an explainer states what belongs in a section and
stops. A reader who wants arc42 itself can search for it.

**Separate item, now settled.** This spec suspected `README.md`'s "arc42 + 2
additions" of being wrong, guessing that three headings had no arc42 counterpart
— Project Structure, Data Stores, and Security as a standalone chapter. Checked
against the live site, the README is right and the guess was wrong: Security is
a split of arc42's Crosscutting Concepts chapter, which lists security among its
own examples, so it is not an addition. Three of our sections split an arc42
chapter rather than adding one (Goals & Scope and External Integrations both
derive from Context and Scope; Architecture Model and Core Components from
Building Block View; Security from Crosscutting Concepts). Only Project
Structure and Data Stores have no counterpart at all. The verified mapping is
recorded in `references/writing.md` beneath the spine list — the point being
that a split is not an addition, which is why the count is 2 and not 5.

### Keys

Spine explainers are keyed by the 16 canonical headings verbatim:

```
Goals & Scope · Constraints · Project Structure · Solution Strategy ·
Architecture Model · Core Components · Runtime Behaviour · Data Stores ·
External Integrations · Deployment & Infrastructure · Crosscutting Concepts ·
Security · Quality Requirements & SLOs · Decisions · Risks & Technical Debt ·
Glossary
```

Companion explainers are keyed by document kind: `threat-model`,
`estimation`, `domain-overview`.

## Implementation

Three files changed, one added.

```
assets/section-help.json     NEW — { spine: {<title>: {...}},
                                     companions: {<kind>: {...}} }

scripts/render.mjs           + kindOf(path, index) → 'spine' | 'threat-model'
                                | 'estimation' | 'domain-overview' | undefined
                             + kind on each page object
                             + SECTION_HELP slot content

scripts/lib/doc-sections.mjs pageEl() emits data-kind="…" when kind is set,
                             beside the existing data-title / data-route

assets/viewer-template.html  + <!-- slot:SECTION_HELP --> marker
                             + injection loop
                             + CSS for the button and the panel
                             + button added to the @media print hide list
```

### Classification

`kindOf` returns `'spine'` for index 0 — `render.mjs` already flags the first
document this way with `spine: i === 0`. Every other document is matched by
basename against a fixed three-entry map, and returns `undefined` when it
matches nothing. Documents with no kind render exactly as they do today.

### Slot content

`embed.mjs` is a strict two-way check: every `<!-- slot:NAME -->` marker needs
content and every slot needs a marker, so the new slot must be added to both
sides in the same change.

Slot substitution is a raw string replace. The JSON is embedded in a
`<script type="application/json">` element, so `<` must be escaped in the
serialised output — otherwise a `</script` sequence appearing anywhere in the
prose would terminate the element early and inject the remainder as markup.

### Injection

Extends the loop in `viewer-template.html` that already prepends a `#` deep-link
anchor to every `.doc h2[id]` / `h3[id]`.

1. For each `h2` inside a `[data-kind="spine"]` page, read `textContent`
   **before** the anchor is prepended, then look the title up in the spine map.
2. On a hit, insert a `[?]` `<button>` into the heading and a `<details>`
   explainer immediately after it. On a miss, leave the heading untouched — a
   renamed or extra heading degrades to today's behaviour, never to a broken
   affordance.
3. For a page whose `data-kind` is a companion kind, insert one explainer under
   its `h1`.
4. The button carries `aria-expanded`, kept in sync with the `<details>` open
   state, and an `aria-label` naming the section.

Client-side rather than build-time on purpose. The viewer already hard-depends
on JS for its router, LikeC4 bundle and mermaid rendering, so a JS-injected
explainer adds no new failure mode — and it keeps `md-render.mjs` a generic
markdown renderer instead of teaching it arch-docs' spine and doc-kind
concepts.

### Interactions with existing behaviour

| Existing behaviour | Effect | Handling |
|---|---|---|
| `tick()` derives read progress from scroll offsets | Expanding shifts the readout | Call `tick()` on toggle. The shift is reader-initiated, so it is expected rather than surprising. |
| `@media print` hides chrome | `[?]` is chrome | Add it to the existing hide list. A closed `<details>` prints closed; paper stays as authored. |
| `prefers-reduced-motion: reduce` already neutralises transitions | Any open/close transition is covered | No new rule needed. |
| Escape is handled once page-wide | — | `<details>` needs no Escape handler. |

## Testing

Extends `scripts/test/viewer-template.test.mjs`, `node:test`, RED-GREEN-VALIDATE.

- All 16 canonical spine titles resolve to an entry in `section-help.json`, and
  the file contains no entry that is not one of the 19 keys.
- Every entry has non-empty `what`, `why`, `good`.
- `kindOf` returns `spine` for index 0, the right kind for each of the three
  companion basenames, and `undefined` for an ADR path, a `CONTEXT.md` path and
  an unknown name.
- `pageEl` emits `data-kind` when set and omits the attribute when not.
- Serialised JSON contains no unescaped `<`.
- Rendered output: `[?]` button present with `aria-expanded` on spine `h2`s,
  absent on `h3`s and on unclassified documents.
- The `@media print` rule hides the button.
- Existing browser verification (see commit `4c367d3`) confirms it renders and
  toggles.

## Out of scope

- Per-ADR, `CONTEXT.md` and `CONTEXT-MAP.md` explainers
- interface-contract explainer
- Hover preview of any kind
- Project-specific or generated explanation text
- Author-overridable explainers
- Explainers on `h3` subheadings
