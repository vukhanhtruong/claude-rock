import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFlowGroup } from '../lib/md-flows.mjs';

// §7 Runtime Behaviour is three flows, each a bold lead-in, its prose, then its
// view marker. Stacked they are ~1400px of scroll nobody compares across — the
// same reason consecutive markers already tab. Prose between the markers is what
// stopped md-views seeing them as a group, so the prose travels into the panel
// with its own diagram instead of being left behind above the tabs.
const S7 = [
  '**Google OAuth login.** The browser never sees the client secret.',
  '',
  '<!-- likec4:view flow-oauth-login -->',
  '',
  '**Tenant-scoped read.** The org id in the URL is never trusted on its own.',
  '',
  '<!-- likec4:view flow-tenant-scoped-read -->',
  '',
  '**Drop to Issues during an L10.** Flag, do not discuss.',
  '',
  '<!-- likec4:view flow-l10-drop-to-issue -->',
  '',
  '## 8. Data Stores',
];

test('a run of prose-then-marker units is one group', () => {
  const group = readFlowGroup(S7, 0);
  assert.ok(group, 'no group found');
  assert.equal(group.units.length, 3);
  assert.equal(group.units[0].id, 'flow-oauth-login');
  assert.equal(group.units[2].id, 'flow-l10-drop-to-issue');
});

// The bold lead-in is the flow's name, so it is the tab label — `flow-oauth-login`
// is a view id, not something a reader picked.
test('the bold lead-in becomes the tab label, without its trailing period', () => {
  const { units } = readFlowGroup(S7, 0);
  assert.equal(units[0].label, 'Google OAuth login');
  assert.equal(units[1].label, 'Tenant-scoped read');
  assert.equal(units[2].label, 'Drop to Issues during an L10');
});

test('the prose travels with its own diagram', () => {
  const { units } = readFlowGroup(S7, 0);
  assert.match(units[0].prose, /never sees the client secret/);
  assert.doesNotMatch(units[0].prose, /org id in the URL/);
});

test('the group consumes exactly its own lines and stops at the next heading', () => {
  const { next } = readFlowGroup(S7, 0);
  assert.equal(S7[next].startsWith('## '), true, `stopped at ${JSON.stringify(S7[next])}`);
});

// One flow is not a group. §12 has a single diagram with prose above it and must
// keep reading as prose above a diagram, not a tab bar with one tab.
test('a single prose-then-marker unit is not a group', () => {
  const one = ['**Only flow.** Prose.', '', '<!-- likec4:view flow-a -->', '', 'After.'];
  assert.equal(readFlowGroup(one, 0), null);
});

// Consecutive markers with no prose are md-views' job and already tab. This must
// not take them over, or the same source grows two different renderings.
test('bare consecutive markers are left to md-views', () => {
  const bare = ['<!-- likec4:view index -->', '<!-- likec4:view containers -->'];
  assert.equal(readFlowGroup(bare, 0), null);
});

test('prose with no marker after it is not a flow', () => {
  const plain = ['Just a paragraph.', '', 'Another one.'];
  assert.equal(readFlowGroup(plain, 0), null);
});

// A unit whose prose is interrupted by a table is not a flow — the group has to
// be prose and a diagram, or the panel silently drops content.
test('a table between prose and marker breaks the group', () => {
  const mixed = [
    '**A.** Prose.', '', '| h |', '|---|', '| v |', '',
    '<!-- likec4:view flow-a -->', '',
    '**B.** Prose.', '', '<!-- likec4:view flow-b -->',
  ];
  assert.equal(readFlowGroup(mixed, 0), null);
});
