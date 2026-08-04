import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pert, projectBuffer, tierFor, aiAdjust, riskBufferHours,
  effectiveCapacity, scenarioRollup,
} from '../lib/estimate-math.mjs';

const close = (got, want) => assert.ok(Math.abs(got - want) < 1e-9, `${got} !~ ${want}`);

test('pert: E=(O+4M+P)/6, sigma=(P-O)/6', () => {
  const { e, sigma } = pert({ o: 16, m: 24, p: 40 });
  close(e, 152 / 6);
  close(sigma, 4);
});

test('project buffer is sqrt of summed squares, not a naive sum', () => {
  close(projectBuffer([4, 3]), 5);
  close(projectBuffer([]), 0);
});

test('factor scores map to tiers at the documented breaks', () => {
  // user's real example: 2+3+5+3+4 = 17 → M
  assert.deepEqual(tierFor({ complexity: 2, size: 3, dependencies: 5, uncertainty: 3, risk: 4 }),
    { total: 17, tier: 'M' });
  assert.equal(tierFor({ complexity: 1, size: 1, dependencies: 2, uncertainty: 3, risk: 3 }).tier, 'S');
  assert.equal(tierFor({ complexity: 5, size: 4, dependencies: 4, uncertainty: 3, risk: 2 }).tier, 'L');
});

test('aiAdjust applies (AO + 2AR + TR)/4 plus verification overhead', () => {
  const e = 152 / 6; // boilerplate, mid: red=0.65, redMax=0.8
  const want = ((e * 0.2 + 2 * (e * 0.35) + e) / 4) * 1.12;
  close(aiAdjust({ e, category: 'boilerplate', seniority: 'mid', verificationPct: 0.12, scale: 1 }), want);
});

test('aiAdjust clamps reduction at 0.9 for outsized scale', () => {
  const got = aiAdjust({ e: 100, category: 'boilerplate', seniority: 'junior', verificationPct: 0, scale: 1.5 });
  const red = 0.9; // 0.65 × 1.15 × 1.5 = 1.121 → clamped
  close(got, (100 * (1 - red) * 3 + 100) / 4); // redMax also clamps to 0.9 so ao == ar
});

test('risk buffer is probability times impact, summed', () => {
  close(riskBufferHours([{ probability: 0.3, impactHours: 40 }, { probability: 0.5, impactHours: 16 }]), 20);
});

test('capacity pays a coordination tax per added engineer, floored at one', () => {
  close(effectiveCapacity(1), 1);
  close(effectiveCapacity(2), 1.8);
  close(effectiveCapacity(3), 2.4);
  close(effectiveCapacity(12), 1); // raw formula goes negative past 10 — floor holds
});

test('scenarioRollup: 1008h, 2 mid @45, max5x → 4.0mo, $51,200', () => {
  const team = [{ seniority: 'mid', rate: 45 }, { seniority: 'mid', rate: 45 }];
  const got = scenarioRollup({ hours: 1008, team, plan: 'max5x' });
  close(got.months, 4);
  close(got.laborCost, 50400);
  close(got.planCost, 800);
  close(got.totalCost, 51200);
});
