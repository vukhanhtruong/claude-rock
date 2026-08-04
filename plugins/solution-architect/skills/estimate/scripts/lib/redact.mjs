// The --client-only export embeds the full estimation JSON in the page; this
// strips the internal money detail (rates, labor/plan cost split, per-task
// hours per scenario) before it ships, unless the inputs opt out via
// exposeRatesToClient. Assumptions/risks are left alone — those are
// client-facing per spec.
function redactScenarioTeam(team) {
  return team.map(({ rate, ...rest }) => rest);
}

function redactComputedScenarios(scenarios) {
  return Object.fromEntries(Object.entries(scenarios).map(([id, s]) => {
    const { laborCost, planCost, taskHours, ...rest } = s;
    return [id, rest];
  }));
}

export function redactForClient(estimation) {
  if (estimation.inputs.exposeRatesToClient) return estimation;
  return {
    ...estimation,
    inputs: {
      ...estimation.inputs,
      scenarios: estimation.inputs.scenarios.map((s) => ({ ...s, team: redactScenarioTeam(s.team) })),
    },
    computed: {
      ...estimation.computed,
      scenarios: redactComputedScenarios(estimation.computed.scenarios),
    },
  };
}
