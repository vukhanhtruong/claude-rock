export function erEntities(md) {
  const names = new Set();
  const fences = md.match(/```mermaid\n[\s\S]*?```/g) ?? [];
  for (const fence of fences) {
    if (!/^\s*erDiagram/m.test(fence)) continue;
    for (const line of fence.split('\n')) collect(line, names);
  }
  return [...names];
}

function collect(line, names) {
  const rel = line.match(/^\s*(\w+)\s+[|}o][|o.-]+[|{o]\s+(\w+)\s*:/);
  if (rel) { names.add(rel[1]); names.add(rel[2]); return; }
  const block = line.match(/^\s*(\w+)\s*\{\s*$/);
  if (block) names.add(block[1]);
}
