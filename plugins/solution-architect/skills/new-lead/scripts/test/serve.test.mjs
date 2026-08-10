import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../serve.mjs';

let server, base, root;
before(async () => {
  root = await mkdtemp(join(tmpdir(), 'srv-'));      // copy fixture so POSTs don't dirty it
  await cp(new URL('./fixtures/root', import.meta.url).pathname, root, { recursive: true });
  // stats.mjs and vendor/* aren't part of the shared fixture (they ship from assets/dashboard
  // in a later milestone) — write minimal stand-ins so the allowlist has something to serve.
  await writeFile(join(root, 'stats.mjs'), 'export const x = 1;\n');
  await mkdir(join(root, 'vendor'), { recursive: true });
  await writeFile(join(root, 'vendor', 'reactflow-bundle.js'), '// stub\n');
  server = await startServer(root, 0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test('GET /api/leads returns enriched registry', async () => {
  const body = await (await fetch(`${base}/api/leads`)).json();
  const acme = body.leads.find(l => l.id === 'acme-crm');
  assert.equal(acme.artifacts.docs, true);
  assert.equal(acme.artifacts.proposal, false);
});
test('GET /api/leads/:id/map returns nodes', async () => {
  const map = await (await fetch(`${base}/api/leads/acme-crm/map`)).json();
  assert.ok(map.nodes.some(n => n.id === 'arch'));
});
test('POST /api/leads/:id marks won and stamps closed', async () => {
  const res = await fetch(`${base}/api/leads/acme-crm`, {
    method: 'POST', body: JSON.stringify({ status: 'won' }),
    headers: { 'content-type': 'application/json' },
  });
  const lead = await res.json();
  assert.equal(lead.status, 'won');
  assert.match(lead.closed, /^\d{4}-\d{2}-\d{2}$/);
});
test('POST bad status -> 400; unknown id -> 404', async () => {
  const bad = await fetch(`${base}/api/leads/acme-crm`, { method: 'POST', body: '{"status":"maybe"}' });
  assert.equal(bad.status, 400);
  const missing = await fetch(`${base}/api/leads/nope`, { method: 'POST', body: '{"status":"won"}' });
  assert.equal(missing.status, 404);
});
test('POST notes writes notes.md and responds {ok: true}', async () => {
  const res = await fetch(`${base}/api/leads/acme-crm/notes`, { method: 'POST', body: '{"content":"call went well"}' });
  assert.deepEqual(await res.json(), { ok: true });
  assert.match(await readFile(join(root, 'acme-crm', 'notes.md'), 'utf8'), /call went well/);
});
test('static serving with traversal guard', async () => {
  assert.equal((await fetch(`${base}/acme-crm/dist/index.html`)).status, 200);
  // Plain "../../etc/passwd" and "%2e%2e" between literal slashes get collapsed by the
  // WHATWG URL parser *before* the request ever leaves fetch() -- the server never sees a
  // ".." segment for those, so they can't exercise the guard (verified empirically: req.url
  // arrives as "/etc/passwd" / "/leads.json.lock", both harmless in-bounds, non-allowlisted
  // paths that the allowlist rule alone already 404s). An encoded *slash* (%2F) is not
  // collapsed by the URL parser -- it survives to the server, where decodeURIComponent turns
  // it into a real ".." segment, which is the guard this test needs to exercise.
  assert.equal((await fetch(`${base}/acme-crm/..%2F..%2Fetc%2Fpasswd`)).status, 403);
  assert.equal((await fetch(`${base}/acme-crm/..%2Fleads.json.lock`)).status, 403);
});
test('static allowlist: leads.json, notes.md, answers.json -> 404; stats.mjs, vendor -> 200', async () => {
  assert.equal((await fetch(`${base}/leads.json`)).status, 404);
  assert.equal((await fetch(`${base}/acme-crm/notes.md`)).status, 404);
  assert.equal((await fetch(`${base}/acme-crm/new-lead-answers.json`)).status, 404);
  assert.equal((await fetch(`${base}/stats.mjs`)).status, 200);
  assert.equal((await fetch(`${base}/vendor/reactflow-bundle.js`)).status, 200);
});
test('id validation guards every :id route before touching the lead dir or map builder', async () => {
  assert.equal((await fetch(`${base}/api/leads/-bad/map`)).status, 404);
  assert.equal((await fetch(`${base}/api/leads/-bad`, { method: 'POST', body: '{"status":"won"}' })).status, 404);
  assert.equal((await fetch(`${base}/api/leads/-bad/notes`, { method: 'POST', body: '{"content":"x"}' })).status, 404);
});
