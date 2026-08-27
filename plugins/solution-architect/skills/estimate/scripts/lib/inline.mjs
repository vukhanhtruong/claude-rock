// The math module is written once as ESM and shipped twice: imported by
// compute.mjs, and inlined here as a plain script so the page's what-if
// controls run the very same formulas the committed numbers came from.
export function inlineModule(src) {
  return src.replaceAll(/^export /gm, '');
}

export function stripInternal(html) {
  return html.replaceAll(/<!-- internal:start -->[\s\S]*?<!-- internal:end -->/g, '');
}

// The agentic what-if rail only needs a handful of the math module's
// exports (team/plan capacity and cost, not the AI-category/PERT machinery
// the agentic page never uses) — inlining the whole file would leak
// AI_CATEGORIES' category names onto a page that must never show them.
// Anchors on `export const NAME` / `export function NAME` at line start,
// same declaration shapes estimate-math.mjs uses throughout.
export function extractExports(src, names) {
  const starts = [...src.matchAll(/^export (?:const|function) (\w+)/gm)];
  return starts
    .map((m, i) => src.slice(m.index, starts[i + 1]?.index ?? src.length).trimEnd())
    .filter((block, i) => names.includes(starts[i][1]))
    .join('\n\n');
}
