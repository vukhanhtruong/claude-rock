# LikeC4 — conventions (thin by design)

Read whenever writing or reviewing a `.c4` model file, or generating a view
for the viewer. This file does not teach LikeC4's DSL — it only records the
conventions arch-docs layers on top of it.

## 1. First rule: DSL syntax lives elsewhere

Before writing any LikeC4 syntax — element declarations, relationships,
views, deployment nodes — fetch and follow LikeC4's own skill:
`github.com/likec4/likec4` → `skills/likec4-dsl/SKILL.md`. That skill is the
single source for DSL questions (grammar, view predicates, styling,
`include`/`exclude` rules, everything). This file adds only what LikeC4's
skill does not know: arch-docs' own naming and structure conventions.

## 2. Our conventions

- **Model files**: `docs/architecture/model/*.c4` — one directory, LikeC4
  reads every `.c4` file in it as one model.
- **Element kinds**: `person` / `system` / `container` / `component`, plus
  the `#external` tag on any `system` outside the documented boundary
  (third-party services, external teams' systems).
- **Declare the tag before you use it.** `tag external` must appear inside
  `specification { }` *before* any element references `#external` —
  otherwise LikeC4 v1.59.2 drops the tag **silently**: the model still
  exports without error, but the element loses its `external` kind, and the
  Table ↔ model agreement validator check (spec §8) will flag it as missing
  from the §9 External Integrations table even though the row is there.
  There is no error message pointing at this — it just fails quietly
  downstream. Correct order, from the committed fixture
  (`scripts/test/fixtures/sample.c4`):

  ```
  specification {
    element person
    element system
    element container
    deploymentNode node
    tag external
  }
  model {
    stripe = system 'Stripe' {
      #external
    }
  }
  ```

- **Declare the palette in `specification { }`.** LikeC4's default element
  colour is blue (`#3b82f6`), and the viewer's own accent — and every mermaid
  diagram beside it — is teal. Left alone, the two diagram systems on one page
  read as two different products. The hexes are **not** free choice: they come
  from `assets/mermaid-theme.json`'s `likec4` block, which is the single palette
  both renderers are cut from — `brand` is the hex mermaid draws `primaryColor`
  with, `muted` is `secondaryColor`.

  ```
  specification {
    color brand #0f766e
    color muted #475569

    element person    { style { color brand } }
    element system    { style { color brand } }
    element container { style { color brand } }
    element component { style { color brand } }
    deploymentNode node { style { color muted } }
    tag external
  }
  ```

  One hex per colour is all there is to give. LikeC4 derives stroke, both
  contrast shades, the relationship line and label colours, **and the entire
  dark rendering** from that single value (`#0f766e` → stroke `#00524b`,
  hiContrast `#c7ffff`). There is no light/dark pair to specify.

  The derivations mermaid has to copy are recorded under `likec4.light` and
  `likec4.dark` — compound group fill/stroke/title and the relation label chip,
  each sampled pixel-for-pixel off a real render in that mode, because LikeC4
  publishes no table of them. Change `brand` and those samples are stale: re-run
  `gen webcomponent`, screenshot both modes, and re-measure
  (`viewer.md` §2 lists the mermaid variables they feed).

  **This bakes in at generate time**, not at view time. A viewer-side CSS
  override does not work: `--likec4-palette-fill` set on `c4-view` reaches the
  host and is then re-declared closer to the node inside the shadow root, so
  the nodes keep the default. Changing the palette means editing the
  specification and re-running `gen webcomponent`.

- **Every container must appear in an `instanceOf`** somewhere under
  `deployment { }`. A logical container with no deployment-node instance is
  a validator failure (`scripts/lib/validate-deployment.mjs`: "container
  ... has no instanceOf in any deployment node") — it means the container
  was modeled but never placed anywhere real.
- **View names** are fixed, not free text:
  - `index` — C1 context view (the whole system + external actors/systems).
  - `containers` — C2 container view.
  - `components-<container>` — one C3 view per container that has
    components, `<container>` being that container's element id.
- **Dynamic views** (runtime flows, §7 Runtime Behaviour) are named
  `flow-<slug>`, one per named flow only — never an unnamed or generic
  "flow1". Keep to 2–4 flows total; a flow worth diagramming is a flow worth
  naming.
- **Deployment view** is always named `deployment` — one view, not one per
  environment (per-environment differences belong in §10's table, not a
  second view).

## 3. Generation commands

Two separate LikeC4 invocations, different outputs, different consumers:

| Command | Output | Consumer |
|---|---|---|
| `npx likec4 export json --outfile <out> <dir>` | model JSON | the validator (`scripts/lib/likec4-extract.mjs` reads it) |
| `npx likec4 gen webcomponent --webcomponent-prefix c4 --outfile <out> <dir>` | webcomponent bundle | the viewer (`viewer.md`) |

`--webcomponent-prefix c4` is **mandatory** on the `gen webcomponent` call.
It pins the generated custom-element tag to `<c4-view>`, which is what the
viewer template and renderer expect. Omit it and LikeC4 falls back to its
own default prefix, emitting `<likec4-view>` instead — the template's
markers never match, and every diagram renders blank with no error.
