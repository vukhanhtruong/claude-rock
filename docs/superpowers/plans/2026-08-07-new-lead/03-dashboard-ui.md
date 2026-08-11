# Milestone 03 — Dashboard UI (index.html)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `00-overview.md` Global Constraints first.

**Goal:** The dashboard page: stats strip, three views (cards / timeline / info wall), filter + sort, won/lost actions. Data logic lives in a node-testable ES module; the page stays served-self-contained (no CDN, no build step).

Base dir: `plugins/solution-architect/skills/new-lead/`. Depends on milestone 02 (server + `/api/leads`).

---

### Task 1: `assets/dashboard/stats.mjs` — pure data logic

**Files:**
- Create: `assets/dashboard/stats.mjs`
- Modify: `scripts/init-root.mjs` (`ASSET_FILES` gains `'stats.mjs'`), `00-overview.md` copy list
- Test: `scripts/test/stats.test.mjs`

**Interfaces:**
- Produces (all pure, no DOM, no fetch):
  - `computeStats(leads, todayISO) -> {wonThisMonth: number, winRate: number|null, pipelineValue: Array<{currency, low, high, count}>|null, avgCycleDays: number|null}`
  - `filterLeads(leads, {status, text}) -> leads` — `status` `'all'|'active'|'won'|'lost'`; `text` case-insensitive substring over `id`, `client`, `title`.
  - `sortLeads(leads, key, dir) -> leads` — `key` `'created'|'closed'|'value'|'client'`; `value` sorts by `value.high ?? -1`; `dir` `'asc'|'desc'`; stable, non-mutating.

Semantics:
- `wonThisMonth`: `status === 'won'` and `closed` in the same `YYYY-MM` as `todayISO`.
- `winRate`: `won / (won + lost)` rounded to 2 decimals; `null` when no closed leads.
- `pipelineValue`: sum of `value.low` / `value.high` over **active** leads that have a value, grouped per currency (`{currency, low, high, count}` per group); `null` when none; groups ordered alphabetically by currency code so render order stays stable.
- `avgCycleDays`: mean of `(closed - created)` in days over won+lost leads with both dates; `null` when none.

- [ ] **Step 1: Write failing tests**

```js
// scripts/test/stats.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, filterLeads, sortLeads } from '../../assets/dashboard/stats.mjs';

const L = (o) => ({ id: 'x', client: 'C', title: 'T', status: 'active',
  created: '2026-08-01', closed: null, value: null, scenario: null, ...o });
const leads = [
  L({ id: 'a', status: 'won', closed: '2026-08-05', value: { low: 10, high: 20, currency: 'USD' } }),
  L({ id: 'b', status: 'won', closed: '2026-07-30' }),
  L({ id: 'c', status: 'lost', closed: '2026-08-02', created: '2026-07-29' }),
  L({ id: 'd', client: 'Acme', value: { low: 5, high: 9, currency: 'USD' } }),
];

test('computeStats', () => {
  const s = computeStats(leads, '2026-08-10');
  assert.equal(s.wonThisMonth, 1);
  assert.equal(s.winRate, 0.67);
  assert.deepEqual(s.pipelineValue, { low: 5, high: 9, currency: 'USD' });
  assert.equal(s.avgCycleDays, 4);   // a: 08-01→08-05 = 4d; b: closed < created, skipped; c: 07-29→08-02 = 4d; mean = 4
});
test('computeStats empty', () => {
  const s = computeStats([], '2026-08-10');
  assert.deepEqual(s, { wonThisMonth: 0, winRate: null, pipelineValue: null, avgCycleDays: null });
});
test('filterLeads by status and text', () => {
  assert.deepEqual(filterLeads(leads, { status: 'won', text: '' }).map(l => l.id), ['a', 'b']);
  assert.deepEqual(filterLeads(leads, { status: 'all', text: 'acme' }).map(l => l.id), ['d']);
});
test('sortLeads by value desc, non-mutating', () => {
  const input = [...leads];
  assert.deepEqual(sortLeads(leads, 'value', 'desc').map(l => l.id), ['a', 'd', 'b', 'c']);
  assert.deepEqual(leads, input);
});
```

Rule under test for `avgCycleDays`: mean of `(closed - created)` days over won+lost leads where `closed >= created` (negative spans skipped), rounded to nearest integer.

- [ ] **Step 2: Run to verify failure** — module missing.

- [ ] **Step 3: Implement** — plain module, first line stamp comment `// new-lead-dashboard v1`. Date math via `Date.UTC` parsing of the ISO strings (no `new Date()` without argument; `todayISO` is always passed in). Keep every function ≤ 20 lines.

- [ ] **Step 4: Run** — PASS (all fixture arithmetic hand-verified).
- [ ] **Step 5: `/simplify`, then commit** — `git commit -m "feat(new-lead): dashboard stats and list logic"`

---

### Task 2: `assets/dashboard/index.html`

**Files:**
- Create: `assets/dashboard/index.html`
- Test: manual browser acceptance (checklist below) against the milestone-02 fixture root

**Interfaces:**
- Consumes: `GET /api/leads`, `POST /api/leads/:id`, `stats.mjs` (via `<script type="module">import { computeStats, filterLeads, sortLeads } from './stats.mjs'</script>`), `todayISO` from `new Date().toISOString().slice(0,10)` (client side — allowed here).
- Produces: links `card → /detail/<id>` and doc links `/<id>/dist/<page>.html` gated on `artifacts` flags.

- [ ] **Step 1: Invoke the `design-taste-frontend` skill** (mandatory per repo memory) with this brief, then build the page through it:

> Single self-contained dashboard page for a pre-sales leads workspace, served from the leads root. First line after doctype: `<!-- new-lead-dashboard v1 -->`. No external requests except same-origin `./stats.mjs` and `/api/leads`. Light + dark themes.
>
> Layout: stats strip pinned top (4 tiles: won this month, win rate, pipeline value low–high, avg cycle days — render `—` for null). Below: toolbar (view switcher cards/timeline/wall, status filter all/active/won/lost, text search, sort select created/closed/value/client + direction toggle). Below: the active view.
>
> Cards view: one card per lead — title, client, status pill, created/closed dates, value range when set; progressive artifact rows: Docs / Estimate / Proposal, each a link when `artifacts.<x>` true else grey "pending" chip (never a dead link); buttons: "Open" → `/detail/<id>`, "Won" / "Lost" (hidden once closed) → `POST /api/leads/<id>` then re-fetch and re-render.
> Timeline view: leads ordered by `created` on a vertical axis with month markers; closed leads show a span to `closed`; won green accent, lost muted.
> Wall view: dense table — every registry field + artifact ticks; clicking a column header sorts by it where the sort keys support it.
>
> View choice, filter, and sort persist in `localStorage` (`newlead.dashboard.*` keys) — display preferences only, never business data.
> Empty root (no leads) renders a friendly "no leads yet — run /new-lead" state.

- [ ] **Step 2: Register the asset** — confirm `index.html` already in `ASSET_FILES` (it is, from milestone 01); nothing to change.

- [ ] **Step 3: Browser acceptance against fixture** — copy `scripts/test/fixtures/root` to a temp dir, run `node scripts/serve.mjs --root <copy> --port 4600`, open `http://127.0.0.1:4600/`, verify each line:

  - [ ] Stats tiles match hand-computed fixture values; null stats render `—`.
  - [ ] Cards: acme-crm shows Docs link + Estimate/Proposal pending chips; link opens the arch viewer.
  - [ ] Filter `won` shows only beta-shop; text search `acme` narrows to acme-crm.
  - [ ] Sort by value desc puts the valued lead first.
  - [ ] Timeline shows month markers and both leads in `created` order.
  - [ ] Wall lists both leads with artifact ticks matching disk.
  - [ ] "Won" on acme-crm: status pill flips, closed date appears, stats strip updates, `leads.json` on disk updated.
  - [ ] Both themes readable (toggle OS theme); no horizontal page scroll at 375px width.
  - [ ] View/filter/sort survive a reload.

- [ ] **Step 4: `/simplify`** (on any JS you hand-wrote in the page), **then commit** — `git commit -m "feat(new-lead): dashboard page with cards, timeline, wall views"`

---

**Milestone exit criteria:** stats tests green; full browser checklist ticked against the fixture root.
