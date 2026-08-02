export function embed({ template, slots }) {
  const markers = [...template.matchAll(/<!-- slot:(\w+) -->/g)].map((m) => m[1]);
  const missing = markers.filter((m) => !(m in slots));
  if (missing.length) throw new Error(`no slot content for marker(s): ${missing.join(', ')}`);
  const unused = Object.keys(slots).filter((s) => !markers.includes(s));
  if (unused.length) throw new Error(`slot(s) without marker: ${unused.join(', ')}`);
  return template.replace(/<!-- slot:(\w+) -->/g, (_, name) => slots[name]);
}
