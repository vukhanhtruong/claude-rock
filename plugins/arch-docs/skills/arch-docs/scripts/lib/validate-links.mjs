import { dirname, join, normalize } from 'node:path';

export function slugify(heading) {
  return heading.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-');
}

export function validateLinks({ links, files, anchors }) {
  return links.flatMap((l) => checkLink(l, files, anchors));
}

function resolveHref(fromDoc, path) {
  return path ? normalize(join(dirname(fromDoc), path)) : '';
}

function checkLink(link, files, anchors) {
  if (/^https?:/.test(link.href)) return [];
  const [path, frag] = link.href.split('#');
  const target = resolveHref(link.fromDoc, path);
  const bad = (why) => [{ check: 'links', message: `${link.fromDoc}: "${link.href}" ${why}` }];
  if (target && !files.includes(target)) return bad('target file missing');
  if (frag && !(anchors[target || link.fromDoc] ?? []).includes(frag)) return bad('anchor missing');
  return [];
}
