export function validateClusters({ clusters, componentRows, minCohesion = 0.5 }) {
  const matches = (c, row) => c.top_nodes.some((n) => row.keyPaths.some((p) => n.startsWith(p)));
  return [
    ...clusters.filter((c) => c.cohesion >= minCohesion && !componentRows.some((r) => matches(c, r)))
      .map((c) => ({ check: 'clusters', message: `cluster "${c.label}" (cohesion ${c.cohesion}) has no component row` })),
    ...componentRows.filter((r) => !clusters.some((c) => matches(c, r)))
      .map((r) => ({ check: 'clusters', message: `component "${r.name}" matches no detected code cluster` })),
  ];
}
