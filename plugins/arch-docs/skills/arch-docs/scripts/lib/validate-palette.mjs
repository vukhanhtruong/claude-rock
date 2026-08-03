// The gate that the obvious check fails to be.
//
// Grepping the bundle for the brand hex passes on an all-blue bundle: a model
// declaring its own colour leaves the brand hex sitting in the colour registry,
// defined and never painted. Both hexes are present and the diagrams are blue.
// The resolved node colour is the only thing that says what is drawn, so that is
// what this reads — together with the theme block, whose mere absence means the
// bundle was generated without the plugin's config at all.
const THEME_FILL = /primary:\{elements:\{fill:`(#[0-9a-fA-F]{3,8})`/;
const NODE_COLOR = /shape:`[a-z]+`,color:`([a-z0-9]+)`/g;

// The names buildLikec4Config overrides. Anything else reaching a node means the
// model painted it from outside the palette.
const IN_PALETTE = new Set(['primary', 'secondary', 'muted', 'gray']);

function themeFinding(bundle, brand) {
  const fill = bundle.match(THEME_FILL);
  if (!fill) {
    return 'likec4 bundle carries no theme palette — generated without likec4.config.json';
  }
  return fill[1].toLowerCase() === brand.toLowerCase()
    ? null
    : `likec4 theme fill ${fill[1]} does not match the shared brand ${brand}`;
}

function nodeFinding(bundle) {
  const used = new Set([...bundle.matchAll(NODE_COLOR)].map((m) => m[1]));
  const off = [...used].filter((name) => !IN_PALETTE.has(name));
  return off.length ? `likec4 nodes painted off-palette: ${off.sort().join(', ')}` : null;
}

export function validatePalette({ bundle, theme }) {
  return [themeFinding(bundle, theme.likec4.brand), nodeFinding(bundle)].filter(Boolean);
}
