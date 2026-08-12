import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initRoot } from '../init-root.mjs';
import { findLeadsRoot } from '../lib/registry.mjs';
import { startServer } from '../serve.mjs';
const run = promisify(execFile);
const UPSERT = new URL('../lead-upsert.mjs', import.meta.url).pathname;
const ASSETS = new URL('../../assets/dashboard', import.meta.url).pathname;
const FIXTURE_LEAD = new URL('./fixtures/root/leads/acme-crm', import.meta.url).pathname;

test('init -> register -> serve -> mark won, end to end', async () => {
  // init a fresh root
  const root = join(await mkdtemp(join(tmpdir(), 'e2e-')), 'leads');
  await initRoot(root, ASSETS);
  assert.ok(existsSync(join(root, 'scripts', 'serve.mjs')), 'server copied');
  assert.ok(existsSync(join(root, 'scripts', 'index.html')), 'dashboard copied');
  assert.equal(findLeadsRoot(join(root)), root);

  // simulate the pipeline having produced a lead dir (fixture stands in for gates 1-3)
  await cp(FIXTURE_LEAD, join(root, 'leads', 'acme-crm'), { recursive: true });
  await run('node', [UPSERT, '--root', root, '--id', 'acme-crm',
    '--patch', '{"client":"Acme","title":"CRM rebuild","created":"2026-08-07"}']);

  // serve and exercise the API like the dashboard would
  const server = await startServer(root, 0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const { leads } = await (await fetch(`${base}/api/leads`)).json();
    assert.equal(leads[0].artifacts.docs, true);
    const map = await (await fetch(`${base}/api/leads/acme-crm/map`)).json();
    assert.ok(map.nodes.length > 3);
    const won = await (await fetch(`${base}/api/leads/acme-crm`, {
      method: 'POST', body: '{"status":"won"}',
      headers: { 'content-type': 'application/json' } })).json();
    assert.equal(won.status, 'won');
    // both dashboard pages must actually open — every other route test here is
    // negative-only, so a serveFile that 404s everything would otherwise ship clean
    for (const [path, marker] of [['/', /id="stats"/], [`/detail/acme-crm`, /id="facts-dl"/]]) {
      const page = await fetch(`${base}${path}`);
      assert.equal(page.status, 200, `${path}: expected 200`);
      assert.equal(page.headers.get('content-type'), 'text/html', `${path}: wrong content-type`);
      assert.match(await page.text(), marker, `${path}: body is not the dashboard page`);
    }
    // refresh is a no-op at same stamp
    assert.deepEqual((await initRoot(root, ASSETS)).copied, []);
  } finally { server.close(); }
});
