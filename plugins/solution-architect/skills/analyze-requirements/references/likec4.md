# LikeC4 — conventions (thin by design)

Read whenever writing or reviewing a `.c4` model file, or generating a view
for the viewer. This file does not teach LikeC4's DSL — it only records the
conventions analyze-requirements layers on top of it.

## 1. First rule: DSL syntax lives elsewhere

Before writing any LikeC4 syntax — element declarations, relationships,
views, deployment nodes — fetch and follow LikeC4's own skill:
`github.com/likec4/likec4` → `skills/likec4-dsl/SKILL.md`. That skill is the
single source for DSL questions (grammar, view predicates, styling,
`include`/`exclude` rules, everything). This file adds only what LikeC4's
skill does not know: analyze-requirements' own naming and structure conventions.

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

- **Declare no colours at all. The plugin owns the palette.**

  This used to say the opposite — write `color brand #0f766e` into
  `specification { }` and style each element kind with it. That instruction was
  wrong twice over, and the second way is why a real set shipped blue.

  | Problem | Detail |
  |---|---|
  | it does not parse | `color muted #475569` is rejected. `muted` is a **reserved built-in** (`primary`, `secondary`, `muted`, `amber`, `gray`, `green`, `indigo`, `red`), and a built-in cannot be redefined in `specification` |
  | it is prose enforcing an invariant | a model that simply omits the palette is **valid**, generates clean, exits 0 — and paints every node LikeC4's default blue beside teal mermaid diagrams. Nothing in the pipeline noticed. That is exactly what happened to the EOS set |

  The palette now comes from a project config the plugin writes, not from the
  model. Run before `gen webcomponent`:

  ```
  node scripts/likec4-config.mjs --out <dir holding the .c4 sources>
  ```

  It writes `likec4.config.json` from `assets/mermaid-theme.json`'s `likec4`
  block — the single palette both renderers are cut from — overriding the
  built-in colour names so output lands in-palette **however the model is
  written**:

  ```json
  { "styles": {
      "theme": { "colors": {
        "primary": "#0f766e", "secondary": "#475569",
        "muted": "#475569", "gray": "#475569" } },
      "defaults": { "color": "primary" } } }
  ```

  LikeC4 reads the config from the folder holding the `.c4` sources. The skill
  generates that folder, so the target repo stays markdown-only.

  Overriding the **built-in names** rather than adding a custom one is
  deliberate: a custom name applies only where something references it, and
  `styles.defaults.color` reaches only elements that declare no colour of their
  own — LikeC4's precedence is kind spec → element → view, and each of those
  beats a default.

  One hex per colour is all there is to give. LikeC4 derives stroke, both
  contrast shades, the relationship line and label colours, **and the entire
  dark rendering** from that single value — verified against 1.59.2, where
  `#0f766e` yields stroke `#00524b` and hiContrast `#c7ffff`, the values
  `mermaid-theme.json` already records. Writing those out would be restating
  derived numbers as if they were ours.

  The derivations mermaid has to copy are recorded under `likec4.light` and
  `likec4.dark` — compound group fill/stroke/title and the relation label chip,
  each sampled pixel-for-pixel off a real render in that mode, because LikeC4
  publishes no table of them. Change `brand` and those samples are stale: re-run
  `gen webcomponent`, screenshot both modes, and re-measure
  (`viewer.md` §2 lists the mermaid variables they feed).

  **This bakes in at generate time**, not at view time. A viewer-side CSS
  override does not work: `--likec4-palette-fill` set on `c4-view` reaches the
  host and is then re-declared closer to the node inside the shadow root, so
  the nodes keep whatever the bundle baked in.

  `render.mjs` refuses a bundle whose theme palette is missing or off — see
  `viewer.md` §1 step 1. It reads the **resolved node colour**, not a hex grep: a
  model declaring its own colour leaves the brand hex sitting in the bundle's
  colour registry, defined and never painted, so a grep passes on an all-blue
  bundle.

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
| `node scripts/likec4-export.mjs --dir <dir> --out <out>` | model JSON | the validator (`scripts/lib/likec4-extract.mjs` reads it) |
| `node scripts/likec4-gen.mjs --dir <dir> --out <bundle>` | webcomponent bundle | the viewer (`viewer.md`) |

The bundle is generated through the wrapper rather than by calling
`npx likec4 gen webcomponent` directly, because `gen` validates nothing: it
produced a 2.2 MB bundle from a workspace carrying 194 validation errors,
silently, exit 0. The wrapper checks the palette config is present, runs
`likec4 validate`, and only then generates — and it supplies
`--webcomponent-prefix c4`, which is **mandatory**. That flag pins the
generated custom-element tag to `<c4-view>`, which is what the viewer template
and renderer expect. Omit it and LikeC4 falls back to its own default prefix,
emitting `<likec4-view>` instead — the template's markers never match, and
every diagram renders blank with no error.

`export json` goes through its own wrapper for a different reason: the palette
config names the project `arch-docs`, so the workspace holds **two** projects
(`arch-docs` + `default`) and a bare `npx likec4 export json` emits an array of
project objects — a shape `likec4-extract.mjs` cannot read. The wrapper pins
`--project arch-docs` and refuses an export that does not parse to a single
object carrying `.elements`. It is still not a validation gate: a broken model
exports too, so run the bundle step first and let it fail there.
