export function validateModelTables({ model, tables, erNames }) {
  const els = (kinds) => model.elements.filter((e) => kinds.includes(e.kind)).map((e) => e.title);
  return [
    ...diff(els(['container', 'component']), names(tables, 'Core Components'), { sourceName: 'model', label: 'component' }),
    ...diff(els(['external']), names(tables, 'External Integrations'), { sourceName: 'model', label: 'external' }),
    ...diff(erNames, names(tables, 'Data Stores'), { sourceName: 'ER diagram', label: 'store' }),
  ];
}

function names(tables, section) {
  const t = tables.find((x) => x.section.includes(section));
  return (t?.rows ?? []).map((r) => r[0].replace(/\[([^\]]*)\]\([^)]*\)/, '$1'));
}

function diff(modelSide, tableSide, ctx) {
  const low = (xs) => xs.map((x) => x.toLowerCase());
  const [m, t] = [low(modelSide), low(tableSide)];
  return [
    ...modelSide.filter((x) => !t.includes(x.toLowerCase()))
      .map((x) => ({ check: 'model-tables', message: `${ctx.label} "${x}" in ${ctx.sourceName} but no table row` })),
    ...tableSide.filter((x) => !m.includes(x.toLowerCase()))
      .map((x) => ({ check: 'model-tables', message: `${ctx.label} "${x}" in table but not in ${ctx.sourceName}` })),
  ];
}
