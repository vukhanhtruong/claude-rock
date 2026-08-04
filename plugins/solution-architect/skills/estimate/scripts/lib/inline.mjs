// The math module is written once as ESM and shipped twice: imported by
// compute.mjs, and inlined here as a plain script so the page's what-if
// controls run the very same formulas the committed numbers came from.
export function inlineModule(src) {
  return src.replaceAll(/^export /gm, '');
}

export function stripInternal(html) {
  return html.replaceAll(/<!-- internal:start -->[\s\S]*?<!-- internal:end -->/g, '');
}
