import http from 'node:http';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { join, relative, extname, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findFreePort } from './lib/port.mjs';

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

function contentType(path) {
  return TYPES[extname(path)] ?? 'application/octet-stream';
}

function resolvePath(dir, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const rel = decoded === '/' ? 'index.html' : decoded.slice(1);
  const resolved = join(dir, rel);
  const relToDir = relative(dir, resolved);
  if (relToDir.startsWith('..') || isAbsolute(relToDir)) return null;
  return resolved;
}

function handle(dir, req, res) {
  try {
    respond(dir, req, res);
  } catch {
    if (!res.headersSent) res.writeHead(400);
    res.end();
  }
}

function respond(dir, req, res) {
  const resolved = resolvePath(dir, req.url);
  if (resolved === null) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (!existsSync(resolved) || statSync(resolved).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'content-type': contentType(resolved) });
  res.end(readFileSync(resolved));
}

export function createServer({ dir, port }) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => handle(dir, req, res));
    server.listen(port, '127.0.0.1', () => resolve({ port, close: () => server.close() }));
  });
}

async function main() {
  const dir = process.argv[2] ?? process.cwd();
  const srv = await createServer({ dir, port: await findFreePort(4173) });
  console.log(`serving ${dir} at http://localhost:${srv.port}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
