// Every formula the estimate ships — imported by compute.mjs at build time and
// inlined verbatim into estimate-template.html at render time, so the browser's
// what-if math and the committed numbers cannot drift apart.

export const AI_CATEGORIES = {
  boilerplate: { min: 0.5, max: 0.8 },
  logic: { min: 0.2, max: 0.4 },
  novel: { min: 0.0, max: 0.1 },
};
export const SENIORITY_FACTOR = { junior: 1.15, mid: 1.0, senior: 0.85 };
export const HOURS_PER_MONTH = 140;
export const COORDINATION_TAX = 0.10;
export const PLAN_PRICES = { none: 0, max5x: 100, max20x: 200 };
export const TIER_BREAKS = [
  { max: 10, tier: 'S' }, { max: 17, tier: 'M' }, { max: Infinity, tier: 'L' },
];

export function pert({ o, m, p }) {
  return { e: (o + 4 * m + p) / 6, sigma: (p - o) / 6 };
}

export function projectBuffer(sigmas) {
  return Math.sqrt(sigmas.reduce((sum, s) => sum + s * s, 0));
}

export function tierFor(scores) {
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  return { total, tier: TIER_BREAKS.find((b) => total <= b.max).tier };
}

const clampRed = (r) => Math.min(Math.max(r, 0), 0.9);

export function aiAdjust({ e, category, seniority, verificationPct, scale = 1 }) {
  const { min, max } = AI_CATEGORIES[category];
  const factor = SENIORITY_FACTOR[seniority] * scale;
  const red = clampRed(((min + max) / 2) * factor);
  const redMax = clampRed(max * factor);
  const [tr, ar, ao] = [e, e * (1 - red), e * (1 - redMax)];
  return ((ao + 2 * ar + tr) / 4) * (1 + verificationPct);
}

export function riskBufferHours(risks) {
  return risks.reduce((sum, r) => sum + r.probability * r.impactHours, 0);
}

export function effectiveCapacity(engineers) {
  return Math.max(1, engineers * (1 - COORDINATION_TAX * (engineers - 1)));
}

export function scenarioRollup({ hours, team, plan }) {
  const months = hours / (effectiveCapacity(team.length) * HOURS_PER_MONTH);
  const laborCost = months * team.reduce((sum, t) => sum + t.rate * HOURS_PER_MONTH, 0);
  const planCost = months * PLAN_PRICES[plan] * team.length;
  return { months, laborCost, planCost, totalCost: laborCost + planCost };
}
