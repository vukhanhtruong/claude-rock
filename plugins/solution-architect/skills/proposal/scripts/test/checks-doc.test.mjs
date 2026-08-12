import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sectionText, tables } from '../lib/sections.mjs';
import { checkDoc } from '../lib/checks-doc.mjs';
import { parseFrontmatter } from '../../../analyze-requirements/scripts/lib/frontmatter.mjs';

const estimation = { computed: { scenarios: { s1: { months: 2, totalCost: 10000 } } }, inputs: { scenarios: [{ id: 's1', team: [] }] } };
const TODAY = new Date('2026-08-06');

const FM = `---
client: Acme Corp
client_tech_level: non-tech
scenario: s1
currency: USD
valid_until: 2099-12-31
source_architecture: ../ARCHITECTURE.md
source_estimation: ../estimation.json
---`;

const SECTION_BODIES = `
## Executive Summary
We fix scheduling.
## Background & Objectives
Bookings are manual today.
## Proposed Solution
\`\`\`mermaid
graph LR; A[You] --> B[New system]
\`\`\`
## Scope
| Feature | What you get |
| --- | --- |
| Booking | Online appointments |
## Out of Scope & Assumptions
- SMS reminders are out.
## Delivery Approach
Two milestones, weekly demos.
## Investment & Timeline
$8,000 – $12,000 over 1.6–2.4 months.
## Team
One senior engineer, one mid-level engineer.
## About Code Engine Studio
We build software. Contact: hello@example.com
## Next Steps
Valid until 2099-12-31. Reply to accept.
`;

const goodMd = `${FM}\n${SECTION_BODIES}`;
const check = (md) => checkDoc({ fm: parseFrontmatter(md).data, md, estimation, today: TODAY });

test('a complete document produces no findings', () => {
  assert.deepEqual(check(goodMd), []);
});

test('sectionText slices one section and returns null for missing ones', () => {
  assert.match(sectionText(goodMd, 'Scope'), /Online appointments/);
  assert.doesNotMatch(sectionText(goodMd, 'Scope'), /SMS reminders/);
  assert.equal(sectionText(goodMd, 'Signature'), null);
});

test('tables groups pipe rows and drops the separator', () => {
  const [t] = tables(sectionText(goodMd, 'Scope'));
  assert.deepEqual(t.header, ['Feature', 'What you get']);
  assert.deepEqual(t.rows, [['Booking', 'Online appointments']]);
});

test('every missing or empty section is a finding', () => {
  const noTeam = goodMd.replace(/## Team[\s\S]*?(?=## About)/, '');
  assert.ok(check(noTeam).some((f) => f.includes('Team')));
  const emptyScope = goodMd.replace('| Booking | Online appointments |\n', '')
    .replace('## Scope\n| Feature | What you get |\n| --- | --- |', '## Scope');
  assert.ok(check(emptyScope).some((f) => f.includes('Scope')));
});

test('frontmatter contract: missing key, bad tech level, unknown scenario', () => {
  assert.ok(check(goodMd.replace('currency: USD\n', '')).some((f) => f.includes('currency')));
  assert.ok(check(goodMd.replace('non-tech', 'wizard')).some((f) => f.includes('client_tech_level')));
  assert.ok(check(goodMd.replace('scenario: s1', 'scenario: ghost')).some((f) => f.includes('ghost')));
});

test('valid_until must be a future ISO date', () => {
  assert.ok(check(goodMd.replace('2099-12-31', '2020-01-01')).some((f) => f.includes('valid_until')));
  assert.ok(check(goodMd.replace('2099-12-31', 'someday')).some((f) => f.includes('valid_until')));
});

test('placeholders and empty tables are findings', () => {
  assert.ok(check(goodMd.replace('We fix scheduling.', 'TBD')).some((f) => /placeholder/i.test(f)));
  assert.ok(check(`${goodMd}\n| A | B |\n| --- | --- |\n`).some((f) => /empty table/i.test(f)));
});

test('Proposed Solution must carry a mermaid diagram', () => {
  const noDiagram = goodMd.replace(/```mermaid[\s\S]*?```/, 'A drawing.');
  assert.ok(check(noDiagram).some((f) => f.includes('mermaid')));
});
