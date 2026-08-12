import { slugify } from './validate-links.mjs';

// Single source of truth for the -N dedupe rule so the renderer (which assigns
// heading ids) and the link validator (which must know which ids exist) never
// drift apart. Callers control dedupe scope by which registry Map they pass in.
export function nextSlug(text, registry) {
  const base = slugify(text);
  const nth = (registry.get(base) ?? 0) + 1;
  registry.set(base, nth);
  return nth === 1 ? base : `${base}-${nth}`;
}
