export function parseTables(md) {
  const lines = md.split('\n');
  const tables = [];
  let section = '';
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith('#')) section = lines[i].replace(/^#+\s*/, '');
    if (!isHeaderRow(lines, i)) continue;
    const table = readTable(lines, i, section);
    tables.push(table);
    i += table.rows.length + 1;
  }
  return tables;
}

function isHeaderRow(lines, i) {
  const next = lines[i + 1] ?? '';
  return lines[i].startsWith('|') && /^\|[\s|:-]+\|$/.test(next.trim());
}

function readTable(lines, i, section) {
  const rows = [];
  for (let j = i + 2; j < lines.length && lines[j].startsWith('|'); j += 1) {
    rows.push(cells(lines[j]));
  }
  return { section, headers: cells(lines[i]), rows };
}

function cells(line) {
  return line.split('|').slice(1, -1).map((c) => c.trim());
}
