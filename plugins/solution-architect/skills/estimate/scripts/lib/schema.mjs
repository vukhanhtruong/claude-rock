// Shape checks for estimation-inputs.json — the agent writes that file, so the
// checks here are the contract that keeps interview output honest before any
// arithmetic happens. Findings are strings with the offending id in them.
import { AI_CATEGORIES, SENIORITY_FACTOR, PLAN_PRICES } from './estimate-math.mjs';

const PROVENANCE = ['observed', 'stated', 'researched', 'proposed'];
const CONFIDENCE = ['HIGH', 'MED', 'LOW'];
const pct = (v) => typeof v === 'number' && v >= 0 && v < 1;

function checkTask(task, out) {
  if (!(task.o > 0 && task.m > 0 && task.p > 0)) out.push(`task ${task.id}: estimates are never 0`);
  if (!(task.o <= task.m && task.m <= task.p)) out.push(`task ${task.id}: expected o <= m <= p`);
  // Object.hasOwn, never `in`: "toString" is `in` every object, and an inherited
  // key here becomes a NaN three tasks later in compute.
  if (!Object.hasOwn(AI_CATEGORIES, task.category)) out.push(`task ${task.id}: unknown category "${task.category}"`);
  if (!CONFIDENCE.includes(task.confidence)) out.push(`task ${task.id}: confidence must be HIGH|MED|LOW`);
  if (!Array.isArray(task.assumptions)) out.push(`task ${task.id}: assumptions array is required`);
  if (!PROVENANCE.includes(task.provenance)) out.push(`task ${task.id}: provenance not in vocabulary`);
}

function checkFeature(feature, out) {
  // Scope items are the clear-vs-assumed split itself: only stated|proposed.
  // (Task rows keep the full four-word vocabulary for their src column.)
  if (!['stated', 'proposed'].includes(feature.provenance)) {
    out.push(`feature ${feature.id}: scope provenance must be stated|proposed`);
  }
  for (const task of feature.tasks ?? []) checkTask(task, out);
}

function checkScenarios(inputs, out) {
  const ids = (inputs.scenarios ?? []).map((s) => s.id);
  if (!ids.includes(inputs.recommendedScenario)) out.push('recommendedScenario names no scenario');
  for (const s of inputs.scenarios ?? []) {
    if (!s.team?.length) out.push(`scenario ${s.id}: empty team`);
    if (!Object.hasOwn(PLAN_PRICES, s.plan)) out.push(`scenario ${s.id}: unknown plan "${s.plan}"`);
    for (const member of s.team ?? []) {
      if (!Object.hasOwn(SENIORITY_FACTOR, member.seniority)) out.push(`scenario ${s.id}: unknown seniority "${member.seniority}"`);
      if (!(typeof member.rate === 'number' && member.rate > 0)) out.push(`scenario ${s.id}: rate must be a positive number`);
    }
  }
}

// Anything compute.mjs would turn into NaN gets refused here instead: the
// "computed truth" contract holds only if every operand is a sane number.
function checkGlobals(inputs, out) {
  if (!pct(inputs.overheadPct)) out.push('overheadPct must be a number in [0, 1)');
  if (!pct(inputs.verificationPct)) out.push('verificationPct must be a number in [0, 1)');
  for (const r of inputs.risks ?? []) {
    if (!(typeof r.probability === 'number' && r.probability >= 0 && r.probability <= 1)) out.push(`risk "${r.name}": probability must be in [0, 1]`);
    if (!(typeof r.impactHours === 'number' && r.impactHours > 0)) out.push(`risk "${r.name}": impactHours must be positive`);
  }
}

export function checkInputs(inputs) {
  const out = [];
  for (const key of ['project', 'technique', 'features', 'risks', 'assumptions', 'scenarios']) {
    if (!(key in inputs)) out.push(`missing top-level "${key}"`);
  }
  for (const feature of inputs.features ?? []) checkFeature(feature, out);
  checkScenarios(inputs, out);
  checkGlobals(inputs, out);
  return out;
}
