// Consecutive view markers already tab (md-views.mjs) — but §7's three flows have
// prose between them, so they fell through as three stacked shells: ~1400px of
// scroll nobody compares across, which is the exact thing tabs exist to fix. The
// prose is why they were not a group, so the prose travels into the panel with its
// own diagram rather than being stranded above a tab bar.

const MARKER = /^<!--\s*likec4:view\s+(\S+)\s*-->$/;
const LEAD = /^\*\*(.+?)\.?\*\*/;

// A flow is prose then exactly one marker. Anything else in between — a table, a
// fence, a heading — means this is not a flow, and guessing would silently drop
// that content into a panel it does not belong in.
function readUnit(lines, i) {
  const prose = [];
  let j = i;
  while (j < lines.length) {
    const line = lines[j].trim();
    if (!line) { j += 1; continue; }
    const marker = line.match(MARKER);
    // A marker with no prose in front of it is md-views' business, not a flow —
    // taking it over would give the same source two different renderings.
    if (marker) return prose.length ? { id: marker[1], prose: prose.join(' '), next: j + 1 } : null;
    if (!prose.length && !LEAD.test(line)) return null;
    if (line.startsWith('#') || line.startsWith('|') || line.startsWith('```')) return null;
    prose.push(lines[j]);
    j += 1;
  }
  return null;
}

export function readFlowGroup(lines, i) {
  const units = [];
  let j = i;
  for (;;) {
    const unit = readUnit(lines, j);
    if (!unit) break;
    units.push({ id: unit.id, prose: unit.prose, label: unit.prose.match(LEAD)[1] });
    j = unit.next;
  }
  // The blank lines after the last marker were separation inside the group, so
  // hand back the next real line rather than making the caller step over them.
  while (j < lines.length && !lines[j].trim()) j += 1;
  // One flow reads as prose above a diagram and must stay that way; a tab bar with
  // one tab is furniture around nothing.
  return units.length > 1 ? { units, next: j } : null;
}
