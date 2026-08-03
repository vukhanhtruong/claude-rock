import { dirname, resolve } from 'node:path';

// The viewer is one HTML file, so a link to a sibling .md has nothing to open —
// every such href in a real set is dead on arrival. Each document is already in
// the DOM under its own id, so an in-set target becomes an in-page anchor. A
// target the viewer does not contain is unwrapped instead: left as a link it
// still looks clickable, which reads worse than plain text.
// The test is "is this a relative path", not "does it end in .md". A .c4 model,
// a directory, a source module — none of them can be a document in the set, so
// all of them are equally dead and all of them read better as text.
const HREF = /<a href="([^"#]*)(#[^"]*)?">([\s\S]*?)<\/a>/g;
const ABSOLUTE = /^([a-z][a-z0-9+.-]*:|\/\/)/i;

export function rewriteDocLinks(html, fromPath, idByPath) {
  const dir = dirname(fromPath);
  return html.replace(HREF, (whole, path, fragment, label) => {
    // No path means an in-page anchor; a scheme or // means it leaves the page.
    if (!path || ABSOLUTE.test(path)) return whole;
    // The fragment is dropped rather than resolved: heading slugs are deduped
    // across the whole set, so #context inside one ADR may have been minted as
    // context-7. The document anchor is the target we can honestly name.
    const id = idByPath.get(resolve(dir, path));
    if (id) return `<a href="#${id}">${label}</a>`;
    return `<span class="ext-ref" title="${path}${fragment ?? ''}">${label}</span>`;
  });
}
