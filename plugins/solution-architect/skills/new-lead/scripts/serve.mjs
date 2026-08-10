// scripts/serve.mjs
// new-lead-dashboard v1
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, sep, extname } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { findLeadsRoot, readRegistry, writeRegistry, STATUSES, ID_RE } from './lib/registry.mjs';
import { enrichLead } from './lib/enrich.mjs';
import { buildLeadMap } from './lib/map.mjs';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.md': 'text/plain',
};
const ID = ID_RE.source.slice(1, -1);
const DIST_RE = new RegExp(`^/(${ID})/dist/`);
const DEFAULT_PORT = 4600;

const ROUTES = [
  ['GET', /^\/$/, ({ root }, req, res) => serveFile(root, res, 'index.html')],
  ['GET', new RegExp(`^/detail/(${ID})$`), ({ root }, req, res) => serveFile(root, res, 'detail.html')],
  ['GET', /^\/api\/leads$/, apiLeads],
  ['GET', new RegExp(`^/api/leads/(${ID})/map$`), async ({ root, id }, req, res) => send(res, 200, await buildLeadMap(root, id))],
  ['POST', new RegExp(`^/api/leads/(${ID})/notes$`), apiNotes],
  ['POST', new RegExp(`^/api/leads/(${ID})$`), apiUpdate],
];

export function startServer(root, port) {
  const server = createServer((req, res) => route(root, req, res)
    .catch((err) => send(res, 500, { error: err.message })));
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)));
}

async function route(root, req, res) {
  const url = new URL(req.url, 'http://internal');
  for (const [method, re, handler] of ROUTES) {
    if (method !== req.method) continue;
    const found = re.exec(url.pathname);
    if (found) return handler({ root, id: found[1] }, req, res);
  }
  return serveStatic(root, url.pathname, res);
}

async function serveFile(root, res, name) {
  const data = await readFile(join(root, name));
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(data);
}

async function apiLeads({ root }, req, res) {
  const registry = await readRegistry(root);
  const leads = await Promise.all(registry.leads.map((l) => enrichLead(root, l)));
  send(res, 200, { version: registry.version, leads });
}

async function apiUpdate({ root, id }, req, res) {
  const body = await readJsonBody(req);
  if (!body || !STATUSES.has(body.status)) return send(res, 400, { error: 'invalid status' });
  const registry = await readRegistry(root);
  const lead = registry.leads.find((l) => l.id === id);
  if (!lead) return send(res, 404, { error: 'not found' });
  lead.status = body.status;
  lead.closed = body.status === 'active' ? null : (body.closed ?? new Date().toISOString().slice(0, 10));
  try {
    await writeRegistry(root, registry);
  } catch (err) {
    return send(res, 409, { error: err.message });
  }
  send(res, 200, lead);
}

async function apiNotes({ root, id }, req, res) {
  if (!existsSync(join(root, id))) return send(res, 404, { error: 'not found' });
  const body = await readJsonBody(req);
  if (typeof body?.content !== 'string') return send(res, 400, { error: 'invalid content' });
  await writeFile(join(root, id, 'notes.md'), body.content);
  send(res, 200, { ok: true });
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    return null;
  }
}

function send(res, status, body) {
  if (body === undefined) { res.writeHead(status); return res.end(); }
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function serveStatic(root, pathname, res) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return send(res, 403); }
  if (decoded.split('/').some((s) => s.startsWith('.'))) return send(res, 403);
  const p = resolve(root, '.' + decoded);
  if (p !== root && !p.startsWith(root + sep)) return send(res, 403);
  const allowed = decoded === '/stats.mjs' || decoded.startsWith('/vendor/') || DIST_RE.test(decoded);
  if (!allowed || !existsSync(p)) return send(res, 404);
  res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
  res.end(await readFile(p));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { root: { type: 'string' }, port: { type: 'string' } } });
  const root = values.root ?? findLeadsRoot(process.cwd());
  if (!root) { console.error('usage: serve.mjs [--root <dir>] [--port <n>]'); process.exit(2); }
  const port = values.port ? Number(values.port) : DEFAULT_PORT;
  const server = await startServer(root, port);
  console.log(`dashboard: http://127.0.0.1:${server.address().port}`);
}
