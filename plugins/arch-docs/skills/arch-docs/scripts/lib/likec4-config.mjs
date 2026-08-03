// The palette is the plugin's, not the model's.
//
// references/likec4.md used to tell whoever wrote the .c4 to declare the brand
// colour in `specification { }`. That is a deterministic invariant carried by
// prose: a model that omits it is still valid, still generates clean, still
// exits 0 — and paints every node LikeC4's default blue next to teal mermaid
// diagrams, with no signal at any step. Which is exactly what shipped.
//
// LikeC4 reads a project config from the folder holding the .c4 sources, and
// `styles.theme.colors` overrides the built-in colour names. Since the skill
// generates the model, it owns that folder, so the palette can be written as a
// build step instead of asked for in a paragraph. The target repo keeps only
// markdown; nothing about the model has to cooperate.
//
// The built-in names are overridden rather than a custom name added: a custom
// name only applies where something references it, and `styles.defaults.color`
// only reaches elements that declare no colour of their own. Overriding the
// names themselves means output lands in-palette however the model was written.
const NEUTRALS = ['secondary', 'muted', 'gray'];

// One hex per colour. LikeC4 derives stroke and both contrast shades from it —
// checked against 1.59.2, where #0f766e yields exactly the #00524b / #c7ffff
// that mermaid-theme.json already records. Writing those out here would be
// restating derived values as if they were ours, and they would go stale the
// first time LikeC4 changes its derivation.
export function buildLikec4Config(theme) {
  const colors = { primary: theme.likec4.brand };
  for (const name of NEUTRALS) colors[name] = theme.likec4.muted;
  return {
    name: 'arch-docs',
    styles: {
      theme: { colors },
      // Pinned, so a LikeC4 default change cannot quietly move the baseline.
      defaults: { color: 'primary' },
    },
  };
}
