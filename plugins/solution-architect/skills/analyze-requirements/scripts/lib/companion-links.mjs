import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { escapeHtml } from './md-inline.mjs';

// estimation.md carries the argument; estimate.html is the same numbers made
// interactive (sortable breakdown, what-if scenarios). Preferred home is the
// shared dist/ output folder — index.html and estimate.html then ship as one
// self-contained directory — with the older beside-estimation.md spot kept as
// a fallback. The link is injected at render time, and only when the file is
// actually there: an md-only run must produce exactly the viewer it produces
// today, never a dead link.
export function estimateLink(page, outDir) {
  if (page.kind !== 'estimation') return '';
  const target = [join(outDir, 'estimate.html'), join(dirname(page.path), 'estimate.html')]
    .find((p) => existsSync(p));
  if (!target) return '';
  const href = escapeHtml(relative(outDir, target));
  return `<p class="estimate-link"><a href="${href}">`
    + 'Interactive estimate — sortable breakdown and what-if scenarios</a></p>\n';
}
