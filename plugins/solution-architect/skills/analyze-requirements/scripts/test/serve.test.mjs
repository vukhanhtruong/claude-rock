import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findFreePort } from '../lib/port.mjs';
import { createServer } from '../serve.mjs';

test('findFreePort returns a usable port', async () => {
  const port = await findFreePort(4173);
  assert.ok(port >= 4173);
});

test('serves index.html, 404s missing, 403s traversal', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'analyze-requirements-'));
  writeFileSync(join(dir, 'index.html'), '<h1>ok</h1>');
  const srv = await createServer({ dir, port: await findFreePort(4200) });
  const base = `http://127.0.0.1:${srv.port}`;
  assert.equal((await fetch(`${base}/`)).status, 200);
  assert.match(await (await fetch(`${base}/`)).text(), /ok/);
  assert.equal((await fetch(`${base}/nope.js`)).status, 404);
  assert.equal((await fetch(`${base}/..%2f..%2fetc%2fpasswd`)).status, 403);
  srv.close();
});

test('rejects sibling-prefix escape', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'analyze-requirements-'));
  const dir = join(parent, 'viewer');
  const evil = join(parent, 'viewer-evil');
  for (const d of [dir, evil]) { mkdirSync(d); }
  writeFileSync(join(evil, 'secret.txt'), 'leak');
  const srv = await createServer({ dir, port: await findFreePort(4300) });
  const res = await fetch(`http://127.0.0.1:${srv.port}/..%2fviewer-evil%2fsecret.txt`);
  assert.equal(res.status, 403);
  srv.close();
});

test('malformed percent-encoding 400s without crashing the server', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'analyze-requirements-'));
  writeFileSync(join(dir, 'index.html'), '<h1>ok</h1>');
  const srv = await createServer({ dir, port: await findFreePort(4400) });
  const base = `http://127.0.0.1:${srv.port}`;
  const res = await fetch(`${base}/%zz`);
  assert.equal(res.status, 400);
  const followUp = await fetch(`${base}/`);
  assert.equal(followUp.status, 200);
  srv.close();
});
