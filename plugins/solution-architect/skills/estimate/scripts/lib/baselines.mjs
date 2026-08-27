// Baseline retrieval and statistics for agentic estimation. Pure functions:
// records in, numbers out. The agent never touches this math — compute.mjs
// calls it, and the deliverable's Evidence section is built from what this
// module actually matched, so cited history can never be invented.
import { pert } from './estimate-math.mjs';

const Z95 = 1.645; // standard normal 95th-percentile z, applied in log space

export function percentile(values, q) {
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

const effectiveModel = (task, ctx) => task.model ?? ctx.model;

function similarScope(rec, task) {
  const mine = task.scope?.affectedFiles;
  if (typeof mine !== 'number' || typeof rec.affected_files !== 'number' || mine <= 0) return false;
  return Math.abs(rec.affected_files - mine) / mine <= 0.5;
}

// Spec §2 ladder: stop at the first rung with enough samples. Rungs 1-3 need
// >= 3; the global rung accepts any evidence over none.
const RUNGS = [
  { level: 1, min: 3, hit: (r, t, c) => r.repository === c.repository && r.agent === c.agent && r.model === effectiveModel(t, c) },
  { level: 2, min: 3, hit: (r, t, c) => r.agent === c.agent },
  { level: 3, min: 3, hit: (r, t) => similarScope(r, t) },
  { level: 4, min: 1, hit: () => true },
];

function summarize(hits, level) {
  const mins = hits.map((r) => r.actual_minutes);
  return {
    p50: percentile(mins, 0.5),
    p80: percentile(mins, 0.8),
    p95: percentile(mins, 0.95),
    minM: percentile(mins, 0),
    maxM: percentile(mins, 1),
    samples: hits.length,
    matchLevel: level,
    evidence: hits.map((r) => ({ id: r.task_id, description: r.task_description, minutes: r.actual_minutes })),
  };
}

export function matchBaseline(task, ctx) {
  const shaped = ctx.records.filter((r) => r.task_shape === task.shape);
  for (const rung of RUNGS) {
    const hits = shaped.filter((r) => rung.hit(r, task, ctx.agentContext));
    if (hits.length >= rung.min) return summarize(hits, rung.level);
  }
  return { samples: 0, matchLevel: 0, evidence: [] };
}

// Spec confidence table: sample count sets the tier, variance can demote
// a would-be HIGH (p80/p50 >= 2 means the history itself is unpredictable).
export function confidenceFor(stats) {
  if (stats.samples === 0) return 'UNCALIBRATED';
  if (stats.samples < 3) return 'LOW';
  if (stats.samples < 10) return 'MED';
  return stats.p80 / stats.p50 < 2 ? 'HIGH' : 'MED';
}
