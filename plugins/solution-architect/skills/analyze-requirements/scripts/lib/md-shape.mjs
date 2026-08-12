export const ITEM = /^(\s*)([-*]|\d+[.)])\s+(.*)$/;

export function isListItem(line) {
  return ITEM.test(line);
}

// The single source of "what kind of line is this" that both the block
// dispatcher and the list continuation rule read from. A shape added here
// is a shape every caller sees — nothing else gets to redeclare the list.
export function shapeOf(lines, i) {
  const line = lines[i];
  if (!line.trim()) return 'blank';
  if (/^#{1,6}\s+/.test(line)) return 'heading';
  if (line.trim().startsWith('```')) return 'fence';
  if (/^<!--\s*likec4:view\s+\S+\s*-->/.test(line.trim())) return 'marker';
  if (line.startsWith('|') && /^\|[\s|:-]+\|$/.test((lines[i + 1] ?? '').trim())) return 'table';
  if (isListItem(line)) return 'list';
  return 'paragraph';
}
