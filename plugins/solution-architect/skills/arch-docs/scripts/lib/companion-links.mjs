import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { escapeHtml } from './md-inline.mjs';

// estimation.md carries the argument; estimate.html beside it is the same
// numbers made interactive (sortable breakdown, what-if scenarios). The link
// is injected at render time, and only when the file is actually there — an
// md-only run must produce exactly the viewer it produces today, never a
// dead link.
export function estimateLink(page, outDir) {
  if (page.kind !== 'estimation') return '';
  const target = join(dirname(page.path), 'estimate.html');
  if (!existsSync(target)) return '';
  const href = escapeHtml(relative(outDir, target));
  return `<p class="estimate-link"><a href="${href}">`
    + 'Interactive estimate — sortable breakdown and what-if scenarios</a></p>\n';
}
