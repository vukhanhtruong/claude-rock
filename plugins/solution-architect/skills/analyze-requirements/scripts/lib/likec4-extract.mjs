// A bare `likec4 export json` on a workspace whose config names a project
// emits an array of project objects. Refused here, where the shape is
// consumed, so no path into the validator runs vacuously over zero elements.
export function extractModel(raw) {
  if (Array.isArray(raw) || !raw?.elements) {
    throw new Error('model JSON is not a single-project object carrying .elements — export it with scripts/likec4-export.mjs');
  }
  return { elements: listElements(raw), deployed: listDeployed(raw) };
}

function listElements(raw) {
  return Object.entries(raw.elements).map(([id, el]) => ({
    id,
    kind: normalizeKind(el),
    title: el.title,
  }));
}

function normalizeKind(el) {
  return (el.tags ?? []).includes('external') ? 'external' : el.kind;
}

function listDeployed(raw) {
  const out = new Set();
  for (const node of Object.values(raw.deployments?.elements ?? {})) {
    if (node.element) out.add(node.element);
  }
  return [...out];
}
