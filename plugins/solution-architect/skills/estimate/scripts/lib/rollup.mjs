// Turns validated estimation-inputs into the estimation.json truth: PERT per
// task, AI-adjusted hours per (task × scenario), buffers, and cost rollups.
// Every map is assembled with sorted keys so repeat runs are byte-identical.
import {
  pert, projectBuffer, taskHours, riskBufferHours, scenarioRollup,
} from './estimate-math.mjs';
import { roadmapFor } from './roadmap.mjs';

const SENIORITY_RANK = { junior: 0, mid: 1, senior: 2 };

function sortedMap(entries) {
  return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}

export function dominantSeniority(team) {
  const counts = {};
  for (const m of team) counts[m.seniority] = (counts[m.seniority] ?? 0) + 1;
  let best = null;
  for (const seniority of Object.keys(counts)) {
    const better = !best
      || counts[seniority] > counts[best]
      || (counts[seniority] === counts[best] && SENIORITY_RANK[seniority] > SENIORITY_RANK[best]);
    if (better) best = seniority;
  }
  return best;
}

export function taskHoursFor(scenario, tasks) {
  const seniority = dominantSeniority(scenario.team);
  const entries = Object.keys(tasks).map((id) => [
    id,
    taskHours({
      e: tasks[id].e, seniority, plan: scenario.plan,
      category: tasks[id].category, verificationPct: tasks[id].verificationPct,
    }),
  ]);
  return sortedMap(entries);
}

export function scenarioBlock(scenario, ctx) {
  const taskHours = taskHoursFor(scenario, ctx.tasks);
  const sumTaskHours = Object.values(taskHours).reduce((a, b) => a + b, 0);
  const hours = sumTaskHours + sumTaskHours * ctx.overheadPct + ctx.spreadBufferHours + ctx.riskBufferHours;
  const rollup = scenarioRollup({ hours, team: scenario.team, plan: scenario.plan });
  const roadmap = roadmapFor({ features: ctx.features, taskHours, months: rollup.months })
    ?.map((b) => ({ ...b, startMonths: round2(b.startMonths), endMonths: round2(b.endMonths) }));
  const notes = [];
  if (scenario.team.length === 1) notes.push('bus factor: single engineer');
  if (scenario.team.length > 3) notes.push('coordination overhead grows past 3 engineers');
  return {
    taskHours: sortedMap(Object.entries(taskHours).map(([id, h]) => [id, round2(h)])),
    hours: round2(hours),
    months: round2(rollup.months),
    laborCost: round2(rollup.laborCost),
    planCost: round2(rollup.planCost),
    totalCost: round2(rollup.totalCost),
    notes,
    ...(roadmap ? { roadmap } : {}),
  };
}

const CONFIDENCE_RANK = { HIGH: 0, MED: 1, LOW: 2 };

export function criticalConfidence(features, tasks) {
  let critical = null;
  for (const feature of features) {
    if (!critical || feature.hours > critical.hours) critical = feature;
  }
  let worst = 'HIGH';
  for (const taskId of critical.taskIds) {
    const confidence = tasks[taskId].confidence;
    if (CONFIDENCE_RANK[confidence] > CONFIDENCE_RANK[worst]) worst = confidence;
  }
  return worst;
}

function buildTasks(inputs) {
  const tasks = {};
  for (const feature of inputs.features) {
    for (const task of feature.tasks) {
      const { e, sigma } = pert(task);
      tasks[task.id] = {
        e, sigma, o: task.o, p: task.p, category: task.category,
        confidence: task.confidence, verificationPct: inputs.verificationPct,
      };
    }
  }
  return tasks;
}

function buildFeatures(inputs, tasks) {
  const features = {};
  const summaries = [];
  for (const feature of inputs.features) {
    const taskIds = feature.tasks.map((t) => t.id);
    const hours = taskIds.reduce((sum, id) => sum + tasks[id].e, 0);
    const low = feature.tasks.reduce((sum, t) => sum + t.o, 0);
    const high = feature.tasks.reduce((sum, t) => sum + t.p, 0);
    features[feature.id] = { hours: round2(hours), low: round2(low), high: round2(high) };
    summaries.push({ hours, taskIds });
  }
  return { features: sortedMap(Object.entries(features)), summaries };
}

function globalBuffers(tasks, risks) {
  const devHours = Object.values(tasks).reduce((sum, t) => sum + t.e, 0);
  const spreadBufferHours = projectBuffer(Object.values(tasks).map((t) => t.sigma));
  return { devHours, spreadBufferHours, riskBufferHours: riskBufferHours(risks) };
}

export function computeEstimation(inputs) {
  const tasks = buildTasks(inputs);
  const { features, summaries } = buildFeatures(inputs, tasks);
  const buffers = globalBuffers(tasks, inputs.risks);
  const ctx = { tasks, features: inputs.features, overheadPct: inputs.overheadPct, ...buffers };
  const scenarios = sortedMap(inputs.scenarios.map((s) => [s.id, scenarioBlock(s, ctx)]));
  const roundedTasks = sortedMap(Object.entries(tasks).map(([id, t]) => [id, { e: round2(t.e), sigma: round2(t.sigma) }]));
  return {
    inputs,
    computed: {
      tasks: roundedTasks,
      features,
      devHours: round2(buffers.devHours),
      overheadHours: round2(buffers.devHours * inputs.overheadPct),
      spreadBufferHours: round2(buffers.spreadBufferHours),
      riskBufferHours: round2(buffers.riskBufferHours),
      scenarios,
      projectConfidence: criticalConfidence(summaries, tasks),
    },
  };
}
