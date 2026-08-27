export const STATUSES = ['DRAFT', 'CLARIFICATION_REQUIRED', 'ANALYZED', 'VALIDATED', 'READY_FOR_ARCHITECTURE'];
export const DEPTHS = ['QUICK', 'STANDARD', 'DEEP'];
export const MODES = ['greenfield', 'existing'];
export const LABELS = ['confirmed', 'assumed', 'recommended'];
export const PRIORITIES = ['P1', 'P2', 'P3'];
export const FR_SCOPES = ['in', 'out', 'future', 'unconfirmed'];
export const AREAS = ['businessContext', 'workflows', 'rules', 'integrations', 'data', 'nfrs'];

export const REGISTERS = [
  ['actors', /^ACT-\d{3}$/],
  ['workflows', /^WF-\d{3}$/],
  ['requirements', /^FR-\d{3}$/],
  ['businessRules', /^BR-\d{3}$/],
  ['scenarios', /^SC-\d{3}$/],
  ['nfrs', /^NFR-\d{3}$/],
  ['integrations', /^INT-\d{3}$/],
  ['data', /^DAT-\d{3}$/],
  ['constraints', /^CON-\d{3}$/],
  ['assumptions', /^ASM-\d{3}$/],
  ['openQuestions', /^Q-\d{3}$/],
  ['conflicts', /^CONFLICT-\d{3}$/],
];

const REQUIRED = ['schemaVersion', 'lead', 'status', 'depth', 'updated', 'mode', 'context', 'scope', 'ai', 'readiness'];
const TOP_ENUMS = [['status', STATUSES], ['depth', DEPTHS], ['mode', MODES]];

const ROW_ENUMS = [
  ['requirements', 'label', LABELS],
  ['requirements', 'scope', FR_SCOPES],
  ['nfrs', 'label', LABELS],
  ['integrations', 'label', LABELS],
  ['integrations', 'direction', ['read', 'write', 'both']],
  ['data', 'label', LABELS],
  ['scenarios', 'type', ['happy', 'edge', 'error']],
  ['assumptions', 'impact', ['high', 'medium', 'low']],
  ['assumptions', 'status', ['unconfirmed', 'accepted', 'resolved']],
  ['openQuestions', 'priority', PRIORITIES],
  ['openQuestions', 'status', ['open', 'answered']],
  ['conflicts', 'status', ['open', 'resolved']],
];

function checkTopLevel(pkg) {
  const findings = [];
  for (const f of REQUIRED) if (!(f in pkg)) findings.push(`missing required field: ${f}`);
  for (const [f, legal] of TOP_ENUMS) {
    if (f in pkg && !legal.includes(pkg[f])) findings.push(`illegal ${f}: ${pkg[f]}`);
  }
  return findings;
}

function checkIds(pkg) {
  const findings = [];
  for (const g of pkg.context?.goals ?? []) {
    if (!/^G-\d{3}$/.test(g.id ?? '')) findings.push(`context.goals: bad id ${g.id}`);
  }
  for (const [name, re] of REGISTERS) {
    for (const row of pkg[name] ?? []) {
      if (!re.test(row.id ?? '')) findings.push(`${name}: bad id ${row.id}`);
    }
  }
  return findings;
}

function checkRowEnums(pkg) {
  const findings = [];
  for (const [name, field, legal] of ROW_ENUMS) {
    for (const row of pkg[name] ?? []) {
      if (row[field] !== undefined && !legal.includes(row[field])) {
        findings.push(`${row.id}: illegal ${field} "${row[field]}"`);
      }
    }
  }
  return findings;
}

export function checkSchema(pkg) {
  return [...checkTopLevel(pkg), ...checkIds(pkg), ...checkRowEnums(pkg)];
}
