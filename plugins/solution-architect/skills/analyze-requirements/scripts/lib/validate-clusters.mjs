// Key paths are file paths; clusters carry packages (top-level folders), never
// file paths — top_nodes are bare symbol names, useless as path prefixes. So
// the match runs each key path against the cluster's packages. Rows that name
// a data store (§8) have no code cluster to match and are exempt.
export function validateClusters({ clusters, componentRows, storeNames = [], minCohesion = 0.5 }) {
  const stores = new Set(storeNames.map((s) => s.toLowerCase()));
  const codeRows = componentRows.filter((r) => !stores.has(r.name.toLowerCase()));
  const matches = (c, row) => row.keyPaths.some((p) => (c.packages ?? []).some((k) => p === k || p.startsWith(k + '/')));
  return [
    ...clusters.filter((c) => c.cohesion >= minCohesion && !codeRows.some((r) => matches(c, r)))
      .map((c) => ({ check: 'clusters', message: `cluster "${c.label}" (cohesion ${c.cohesion}) has no component row` })),
    ...codeRows.filter((r) => !clusters.some((c) => matches(c, r)))
      .map((r) => ({ check: 'clusters', message: `component "${r.name}" matches no detected code cluster` })),
  ];
}
