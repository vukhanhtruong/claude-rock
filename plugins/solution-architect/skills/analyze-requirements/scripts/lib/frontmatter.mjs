export function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { data: null, error: 'no frontmatter block' };
  const data = {};
  for (const line of m[1].split('\n')) {
    if (!line.trim()) continue;
    const i = line.indexOf(':');
    if (i === -1) return { data: null, error: `bad line: ${line}` };
    data[line.slice(0, i).trim()] = parseValue(line.slice(i + 1).trim());
  }
  return { data };
}

function parseValue(raw) {
  if (!raw.startsWith('[') && !raw.startsWith('{')) return raw;
  try { return JSON.parse(raw); } catch { return raw; }
}
