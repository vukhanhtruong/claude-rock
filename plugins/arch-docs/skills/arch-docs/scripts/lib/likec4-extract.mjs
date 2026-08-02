export function extractModel(raw) {
  return { elements: listElements(raw), deployed: listDeployed(raw) };
}

function listElements(raw) {
  return Object.entries(raw.elements ?? {}).map(([id, el]) => ({
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
