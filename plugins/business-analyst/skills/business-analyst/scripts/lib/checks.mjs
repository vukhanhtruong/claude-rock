import { REGISTERS } from './schema.mjs';

const LABELED = ['requirements', 'nfrs', 'integrations', 'data'];
const SOURCED = ['requirements', 'businessRules', 'constraints'];

export function collectIds(pkg) {
  const ids = new Set((pkg.context?.goals ?? []).map((g) => g.id));
  for (const [name] of REGISTERS) for (const row of pkg[name] ?? []) ids.add(row.id);
  return ids;
}

export function checkDuplicates(pkg) {
  const findings = [];
  const seen = new Set();
  const rows = [...(pkg.context?.goals ?? []), ...REGISTERS.flatMap(([name]) => pkg[name] ?? [])];
  for (const row of rows) {
    if (seen.has(row.id)) findings.push(`duplicate id: ${row.id}`);
    seen.add(row.id);
  }
  return findings;
}

export function checkRefs(pkg, ids) {
  const findings = [];
  const miss = (owner, ref) => findings.push(`${owner}: dangling reference ${ref}`);
  for (const fr of pkg.requirements ?? []) {
    const t = fr.traces ?? {};
    const refs = [t.goal, t.workflow, ...(t.rules ?? []), ...(fr.acceptance ?? [])];
    for (const ref of refs) if (ref && !ids.has(ref)) miss(fr.id, ref);
  }
  for (const br of pkg.businessRules ?? []) {
    if (br.openQuestion && !ids.has(br.openQuestion)) miss(br.id, br.openQuestion);
  }
  for (const sc of pkg.scenarios ?? []) if (!ids.has(sc.requirement)) miss(sc.id, sc.requirement);
  for (const q of pkg.openQuestions ?? []) {
    for (const ref of q.affects ?? []) if (!ids.has(ref)) miss(q.id, ref);
  }
  for (const ref of pkg.readiness?.blockers ?? []) if (!ids.has(ref)) miss('readiness.blockers', ref);
  return findings;
}

function hasOpenQuestionFor(pkg, id) {
  return (pkg.openQuestions ?? []).some((q) => (q.affects ?? []).includes(id));
}

export function checkLabels(pkg) {
  const findings = [];
  for (const name of LABELED) {
    for (const row of pkg[name] ?? []) if (!row.label) findings.push(`${row.id}: missing label`);
  }
  for (const name of SOURCED) {
    for (const row of pkg[name] ?? []) if (!row.source) findings.push(`${row.id}: missing source`);
  }
  for (const fr of pkg.requirements ?? []) {
    if (fr.label === 'recommended' && fr.scope === 'in' && !hasOpenQuestionFor(pkg, fr.id)) {
      findings.push(`${fr.id}: recommended requirement in scope "in" without a paired open question`);
    }
  }
  return findings;
}
