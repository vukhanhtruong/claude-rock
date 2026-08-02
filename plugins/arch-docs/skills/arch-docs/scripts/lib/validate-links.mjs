export function slugify(heading) {
  return heading.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-');
}

export function validateLinks({ links, files, anchors }) {
  return links.flatMap((l) => checkLink(l, files, anchors));
}

function checkLink(link, files, anchors) {
  if (/^https?:/.test(link.href)) return [];
  const [path, frag] = link.href.split('#');
  const bad = (why) => [{ check: 'links', message: `${link.fromDoc}: "${link.href}" ${why}` }];
  if (path && !files.includes(path)) return bad('target file missing');
  if (frag && !(anchors[path || link.fromDoc] ?? []).includes(frag)) return bad('anchor missing');
  return [];
}
