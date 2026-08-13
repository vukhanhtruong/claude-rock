import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../serve.mjs';
import { findFreePort } from '../lib/port.mjs';

// A bare net server occupies the port; no dashboard fixture is needed, and
// startServer only realpaths its root, so an empty dir satisfies it.
const occupy = () => new Promise((ok) => {
  const srv = net.createServer();
  srv.listen(0, '127.0.0.1', () => ok(srv));
});

test('startServer rejects with the port number when it is already taken', { timeout: 5000 }, async () => {
  const srv = await occupy();
  const taken = srv.address().port;
  const root = await mkdtemp(join(tmpdir(), 'srv-'));
  await assert.rejects(startServer(root, taken), new RegExp(`port ${taken} in use`));
  await new Promise((resolve) => srv.close(resolve));
});

test('findFreePort scans past a taken port instead of failing', { timeout: 5000 }, async () => {
  const srv = await occupy();
  const taken = srv.address().port;
  const free = await findFreePort(taken);
  assert.ok(free > taken, `expected a port above ${taken}, got ${free}`);
  await new Promise((resolve) => srv.close(resolve));
});
