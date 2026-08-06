// Client-facing figures derived from estimation.json — the proposal never
// invents a number. Totals come from the chosen scenario; ranges scale by
// the feature low/high spread; milestone splits follow the roadmap shares.
export const round1 = (n) => Math.round(n * 10) / 10;
export const round100 = (n) => Math.round(n / 100) * 100;
export const formatMoney = (n) => `$${n.toLocaleString('en-US')}`;

function spreadRatios(computed) {
  const feats = Object.values(computed.features);
  const hours = feats.reduce((s, f) => s + f.hours, 0);
  return {
    lo: feats.reduce((s, f) => s + f.low, 0) / hours,
    hi: feats.reduce((s, f) => s + f.high, 0) / hours,
  };
}

const range = (value, ratios, round) => ({ low: round(value * ratios.lo), high: round(value * ratios.hi) });

function milestoneFigures(scenario, ratios) {
  return (scenario.roadmap ?? []).map((band) => {
    const width = band.endMonths - band.startMonths;
    return {
      name: band.name,
      cost: range(scenario.totalCost * (width / scenario.months), ratios, round100),
      months: range(width, ratios, round1),
    };
  });
}

export function deriveFigures(estimation, scenarioId) {
  const scenario = estimation.computed.scenarios[scenarioId];
  if (!scenario) throw new Error(`scenario "${scenarioId}" not in estimation.json`);
  const ratios = spreadRatios(estimation.computed);
  const team = (estimation.inputs.scenarios.find((s) => s.id === scenarioId)?.team ?? [])
    .map((m) => m.seniority);
  return {
    scenario: scenarioId,
    cost: range(scenario.totalCost, ratios, round100),
    months: range(scenario.months, ratios, round1),
    milestones: milestoneFigures(scenario, ratios),
    team,
  };
}
