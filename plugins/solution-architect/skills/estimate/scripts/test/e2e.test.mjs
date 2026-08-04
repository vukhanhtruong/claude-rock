import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from '../../../arch-docs/scripts/serve.mjs';
import { findFreePort } from '../../../arch-docs/scripts/lib/port.mjs';

const scripts = new URL('..', import.meta.url).pathname;
const fixture = join(scripts, 'test/fixtures/booking-inputs.json');
const passMd = join(scripts, 'test/fixtures/estimation-pass.md');

test('SKILL.md exists with hard rules and auto-trigger description', () => {
  const skill = readFileSync(new URL('../../SKILL.md', import.meta.url), 'utf8');
  assert.match(skill, /^name: estimate$/m);
  assert.match(skill, /^description: .*(estimate|effort|quote)/m);
  assert.match(skill, /never `?0`?/);            // honesty rule stated
  assert.match(skill, /blanket/i);               // per-task multiplier rule stated
});

test('fixture flows compute → validate → render → serve', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'estimate-e2e-'));
  const json = join(dir, 'estimation.json');
  execFileSync('node', [join(scripts, 'compute.mjs'), '--inputs', fixture, '--out', json]);
  execFileSync('node', [join(scripts, 'validate.mjs'), '--md', passMd, '--json', json]); // exit 0 or throws
  execFileSync('node', [join(scripts, 'render.mjs'), '--json', json, '--md', passMd, '--out', dir]);
  const srv = await createServer({ dir, port: await findFreePort(4173) });
  try {
    const res = await fetch(`http://127.0.0.1:${srv.port}/estimate.html`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Booking App/);
  } finally { srv.close(); }
});
