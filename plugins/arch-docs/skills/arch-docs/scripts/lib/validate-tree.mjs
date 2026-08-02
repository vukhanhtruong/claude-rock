export function validateTree({ boundaryRows, fsDirs }) {
  const documented = boundaryRows.map(norm);
  const actual = fsDirs.map(norm);
  const covered = (a) => documented.some((d) => a === d || a.startsWith(`${d}/`));
  return [
    ...documented.filter((d) => !actual.includes(d))
      .map((d) => ({ check: 'tree', message: `documented dir "${d}" not found on filesystem` })),
    ...actual.filter((a) => !covered(a))
      .map((a) => ({ check: 'tree', message: `dir "${a}" exists but is not documented in the boundary map` })),
  ];
}

function norm(p) {
  return p.replace(/\/+$/, '');
}
