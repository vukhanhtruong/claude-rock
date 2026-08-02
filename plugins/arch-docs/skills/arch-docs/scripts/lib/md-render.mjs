import { slugify } from './validate-links.mjs';

export function renderMarkdown(md, slugs = new Map()) {
  const ctx = {
    lines: md.replace(/^---\n[\s\S]*?\n---\n?/, '').split('\n'),
    i: 0, html: [], headings: [], slugs,
  };
  while (ctx.i < ctx.lines.length) dispatch(ctx);
  return { html: ctx.html.join('\n'), headings: ctx.headings };
}

function shapeOf(lines, i) {
  const line = lines[i];
  if (!line.trim()) return 'blank';
  if (/^#{1,3}\s+/.test(line)) return 'heading';
  if (line.trim() === '```mermaid') return 'fence';
  if (/^<!--\s*likec4:view\s+\S+\s*-->/.test(line.trim())) return 'marker';
  if (line.startsWith('|') && /^\|[\s|:-]+\|$/.test((lines[i + 1] ?? '').trim())) return 'table';
  return 'paragraph';
}

function dispatch(ctx) {
  const shape = shapeOf(ctx.lines, ctx.i);
  if (shape === 'blank') { ctx.i += 1; return; }
  if (shape === 'heading') return renderHeading(ctx);
  if (shape === 'fence') return renderFence(ctx);
  if (shape === 'marker') return renderMarker(ctx);
  if (shape === 'table') return renderTable(ctx);
  return renderParagraph(ctx);
}

function renderHeading(ctx) {
  const [, hashes, raw] = ctx.lines[ctx.i].match(/^(#{1,3})\s+(.*)$/);
  const level = hashes.length;
  const text = raw.trim();
  if (level === 1) {
    ctx.html.push(`<h1>${inline(text)}</h1>`);
  } else {
    const base = slugify(text);
    const nth = (ctx.slugs.get(base) ?? 0) + 1;
    ctx.slugs.set(base, nth);
    const slug = nth === 1 ? base : `${base}-${nth}`;
    ctx.html.push(`<h${level} id="${slug}">${inline(text)}</h${level}>`);
    ctx.headings.push({ level, text, slug });
  }
  ctx.i += 1;
}

function renderFence(ctx) {
  const code = [];
  let j = ctx.i + 1;
  while (j < ctx.lines.length && ctx.lines[j].trim() !== '```') { code.push(ctx.lines[j]); j += 1; }
  const canvas = `<div class="mermaid-canvas">${escapeHtml(code.join('\n'))}</div>`;
  ctx.html.push(`<div class="diagram-shell">${canvas}</div>`);
  ctx.i = j + 1;
}

function renderMarker(ctx) {
  const [, id] = ctx.lines[ctx.i].trim().match(/^<!--\s*likec4:view\s+(\S+)\s*-->/);
  ctx.html.push(`<div class="diagram-shell"><c4-view view-id="${id}"></c4-view></div>`);
  ctx.i += 1;
}

function renderTable(ctx) {
  const cells = (line) => line.split('|').slice(1, -1).map((c) => c.trim());
  const headRow = `<tr>${cells(ctx.lines[ctx.i]).map((c) => `<th>${inline(c)}</th>`).join('')}</tr>`;
  const rows = [];
  let j = ctx.i + 2;
  while (j < ctx.lines.length && ctx.lines[j].startsWith('|')) {
    rows.push(`<tr>${cells(ctx.lines[j]).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`);
    j += 1;
  }
  ctx.html.push(`<table>${headRow}${rows.join('')}</table>`);
  ctx.i = j;
}

function renderParagraph(ctx) {
  const collected = [];
  let j = ctx.i;
  while (j < ctx.lines.length && shapeOf(ctx.lines, j) === 'paragraph') {
    collected.push(ctx.lines[j]);
    j += 1;
  }
  ctx.html.push(`<p>${inline(collected.join(' '))}</p>`);
  ctx.i = j;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
}
