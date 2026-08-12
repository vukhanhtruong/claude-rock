# Milestone 07 — End-to-End Verification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `00-overview.md` Global Constraints first.

**Goal:** Prove the pieces work as one system: a scripted workspace-lifecycle integration test, then a live `/new-lead` run on a toy lead with the user.

Base dir: `plugins/solution-architect/skills/new-lead/`. Depends on all prior milestones.

---

### Task 1: Workspace lifecycle integration test

**Files:**
- Test: `scripts/test/e2e-workspace.test.mjs`

**Interfaces:**
- Consumes: `initRoot`, `lead-upsert.mjs`, `startServer`, milestone-02 fixture.

- [ ] **Step 1: Write the test** — one flow, asserting at each stage:

```js
// scripts/test/e2e-workspace.test.mjs
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
const FIXTURE_LEAD = new URL('./fixtures/root/acme-crm', import.meta.url).pathname;

test('init -> register -> serve -> mark won, end to end', async () => {
  // init a fresh root
  const root = join(await mkdtemp(join(tmpdir(), 'e2e-')), 'leads');
  await initRoot(root, ASSETS);
  assert.ok(existsSync(join(root, 'serve.mjs')), 'server copied');
  assert.ok(existsSync(join(root, 'index.html')), 'dashboard copied');
  assert.equal(findLeadsRoot(join(root)), root);

  // simulate the pipeline having produced a lead dir (fixture stands in for gates 1-3)
  await cp(FIXTURE_LEAD, join(root, 'acme-crm'), { recursive: true });
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
    // refresh is a no-op at same stamp
    assert.deepEqual((await initRoot(root, ASSETS)).copied, []);
  } finally { server.close(); }
});
```

- [ ] **Step 2: Run it** — expected PASS if milestones 01–04 are correct; any failure here is an integration bug: fix in the owning module (with a regression test there), not here.
- [ ] **Step 3: Full suite + coverage** — `node --test --experimental-test-coverage plugins/solution-architect/skills/new-lead/scripts/test/` — all green, scripts coverage ≥ 80%, no file > 200 lines (`wc -l scripts/**/*.mjs assets/dashboard/*.mjs`).
- [ ] **Step 4: `/simplify`** (if any code changed), **then commit** — `git commit -m "test(new-lead): workspace lifecycle integration test"`

---

### Task 2: Live `/new-lead` run — with the user

Interactive — schedule it with the user. Use a small real-ish toy lead (suggestion: the estimate skill's canonical booking-system fixture as the "client ask", evidence = a one-page fake RFP written for the occasion).

- [ ] **Step 1: Fresh session, run `/new-lead`** in an empty scratch directory. Verify checklist as it goes:

  - [ ] Root init offered and created; `git init` offered; dashboard reachable immediately with the new lead visible as `active`, all stages pending.
  - [ ] Evidence scan reports the fake RFP; interview arrives in themed batches (never one wall); prefilled values shown for confirmation.
  - [ ] ARCH workflow: research agents visibly parallel (`/workflows`); gate 1 shows ARCHITECTURE.md + applied/rejected report; approval renders the viewer; dashboard card flips Docs ✓ live on refresh.
  - [ ] Gate 2: estimation.md shown; scenario picked here; registry `value` set; estimate.html link goes live; stats strip pipeline value updates.
  - [ ] Gate 3: proposal.md review; render; all three links live; detail page lineage fully `ready`, picked scenario highlighted, brief.md summary present, activity feed shows the gate commits.
  - [ ] Mark the toy lead lost from the dashboard; stats update; `git log` in the root shows the full trail.

- [ ] **Step 2: Exercise one failure path for real** — at gate 1, request a change instead of approving; verify the workflow resumes (cached agents skip), the fix lands, and the gate re-presents.

- [ ] **Step 3: Record outcomes** — any deviation between spec and observed behavior becomes either an immediate fix (small) or a follow-up task list posted to the user (large). Do not mark this milestone complete with unexplained deviations.

- [ ] **Step 4: Cleanup + final commit** — remove the scratch root; `git commit` any fixes (each with `/simplify` first).

---

**Milestone exit criteria:** integration test green in the full suite; live run completed with every checklist line ticked or explicitly waived by the user.
