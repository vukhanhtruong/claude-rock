import { nextSlug } from './slug-registry.mjs';
import { escapeHtml, inline } from './md-inline.mjs';
import { isListItem, renderList } from './md-list.mjs';

export { escapeHtml };

export function renderMarkdown(md, slugs = new Map(), docSlugs = new Map()) {
  const ctx = {
    lines: md.replace(/^---\n[\s\S]*?\n---\n?/, '').split('\n'),
    i: 0, html: [], headings: [], slugs, docSlugs, title: null, docId: null,
  };
  while (ctx.i < ctx.lines.length) dispatch(ctx);
  return {
    html: ctx.html.join('\n'),
    headings: ctx.headings,
    title: ctx.title ?? ctx.headings[0]?.text ?? 'Document',
    docId: ctx.docId,
  };
}

function shapeOf(lines, i) {
  const line = lines[i];
  if (!line.trim()) return 'blank';
  if (/^#{1,6}\s+/.test(line)) return 'heading';
  if (line.trim().startsWith('```')) return 'fence';
  if (/^<!--\s*likec4:view\s+\S+\s*-->/.test(line.trim())) return 'marker';
  if (line.startsWith('|') && /^\|[\s|:-]+\|$/.test((lines[i + 1] ?? '').trim())) return 'table';
  if (isListItem(line)) return 'list';
  return 'paragraph';
}

function dispatch(ctx) {
  const shape = shapeOf(ctx.lines, ctx.i);
  if (shape === 'blank') { ctx.i += 1; return; }
  if (shape === 'heading') return renderHeading(ctx);
  if (shape === 'fence') return renderFence(ctx);
  if (shape === 'marker') return renderMarker(ctx);
  if (shape === 'table') return renderTable(ctx);
  if (shape === 'list') return renderListBlock(ctx);
  return renderParagraph(ctx);
}

function renderListBlock(ctx) {
  const { html, next } = renderList(ctx.lines, ctx.i);
  ctx.html.push(html);
  ctx.i = next;
}

function renderHeading(ctx) {
  const [, hashes, raw] = ctx.lines[ctx.i].match(/^(#{1,6})\s+(.*)$/);
  const level = hashes.length;
  const text = raw.trim();
  ctx.i += 1;
  if (level === 1) {
    const id = `doc-${nextSlug(text, ctx.docSlugs)}`;
    ctx.title ??= text;
    ctx.docId ??= id;
    ctx.html.push(`<h1 id="${id}" class="doc-head">${inline(text)}</h1>`);
    return;
  }
  if (level !== 2 && level !== 3) {
    ctx.html.push(`<h${level}>${inline(text)}</h${level}>`);
    return;
  }
  const slug = nextSlug(text, ctx.slugs);
  ctx.html.push(`<h${level} id="${slug}">${inline(text)}</h${level}>`);
  ctx.headings.push({ level, text, slug });
}

function renderFence(ctx) {
  const lang = ctx.lines[ctx.i].trim().slice(3).trim();
  const code = [];
  let j = ctx.i + 1;
  while (j < ctx.lines.length && ctx.lines[j].trim() !== '```') { code.push(ctx.lines[j]); j += 1; }
  const body = escapeHtml(code.join('\n'));
  ctx.i = j + 1;
  if (lang !== 'mermaid') {
    ctx.html.push(`<pre><code>${body}</code></pre>`);
    return;
  }
  ctx.html.push(`<div class="diagram-shell"><div class="mermaid-canvas">${body}</div></div>`);
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

