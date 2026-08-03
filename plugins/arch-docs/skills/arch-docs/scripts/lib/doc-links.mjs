import { dirname, resolve } from 'node:path';

// The viewer is one HTML file, so a link to a sibling .md has nothing to open —
// every such href in a real set is dead on arrival. Each document is already in
// the DOM under its own id, so an in-set target becomes an in-page anchor. A
// target the viewer does not contain is unwrapped instead: left as a link it
// still looks clickable, which reads worse than plain text.
const DOC_HREF = /<a href="([^"]*\.md)(#[^"]*)?">([\s\S]*?)<\/a>/g;

export function rewriteDocLinks(html, fromPath, idByPath) {
  const dir = dirname(fromPath);
  return html.replace(DOC_HREF, (whole, href, _fragment, label) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return whole;
    // The fragment is dropped rather than resolved: heading slugs are deduped
    // across the whole set, so #context inside one ADR may have been minted as
    // context-7. The document anchor is the target we can honestly name.
    const id = idByPath.get(resolve(dir, href));
    if (id) return `<a href="#${id}">${label}</a>`;
    return `<span class="ext-ref" title="${href}">${label}</span>`;
  });
}
