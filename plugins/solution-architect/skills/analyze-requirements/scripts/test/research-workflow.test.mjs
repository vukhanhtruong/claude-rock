import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../workflows/research.js', import.meta.url), 'utf8')
  .replace(/^export const meta =/m, 'const meta =');
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

function run({ agentImpl, args }) {
  const calls = { phases: [], logs: [] };
  const fn = new AsyncFunction('agent', 'parallel', 'pipeline', 'phase', 'log', 'args', 'budget', src);
  const parallel = (thunks) => Promise.all(thunks.map((t) => t().catch(() => null)));
  return fn(agentImpl, parallel, null, (p) => calls.phases.push(p), (m) => calls.logs.push(m), args,
    { total: null, spent: () => 0, remaining: () => Infinity }).then((result) => ({ result, calls }));
}

const okAgent = async (prompt) => ({ facts: [{ fact: `re: ${prompt.slice(0, 20)}`, provenance: 'researched', source: 'x' }] });
const ARGS = { mode: 'greenfield', projectType: 'web', domain: 'billing', statedFacts: [{ claim: 'uses stripe' }], gaps: ['stripe'] };

test('greenfield runs all three phases and returns facts', async () => {
  const { result, calls } = await run({ agentImpl: okAgent, args: ARGS });
  assert.deepEqual(calls.phases, ['Domain', 'Stack', 'Design']);
  assert.ok(result.domain.length > 0 && result.aspects.length > 0);
  assert.equal(result.dropped.length, 0);
});

test('brownfield skips Design phase', async () => {
  const { result, calls } = await run({ agentImpl: okAgent, args: { ...ARGS, mode: 'brownfield' } });
  assert.ok(!calls.phases.includes('Design'));
  assert.deepEqual(result.aspects, []);
});

test('failed agent lands in dropped and is logged', async () => {
  const flaky = async (p) => (p.includes('Verify') ? null : okAgent(p));
  const { result, calls } = await run({ agentImpl: flaky, args: { ...ARGS, mode: 'brownfield' } });
  assert.equal(result.dropped.length, 1);
  assert.ok(calls.logs.some((l) => l.includes('DROPPED')));
});
