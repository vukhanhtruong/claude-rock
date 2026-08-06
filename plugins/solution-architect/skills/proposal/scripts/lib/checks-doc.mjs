// Structural half of the proposal gate: frontmatter contract, the ten
// sections, placeholder scan, future validity. Client-safety checks live
// in checks-client.mjs.
import { SECTIONS, sectionText, tables } from './sections.mjs';

const FM_KEYS = ['client', 'client_tech_level', 'scenario', 'currency',
  'valid_until', 'source_architecture', 'source_estimation'];
const TECH_LEVELS = ['non-tech', 'low-tech', 'technical'];

function checkFrontmatter({ fm, estimation, today }, out) {
  for (const key of FM_KEYS) {
    if (!fm[key]) out.push(`frontmatter: missing "${key}"`);
  }
  if (fm.client_tech_level && !TECH_LEVELS.includes(fm.client_tech_level)) {
    out.push(`frontmatter: client_tech_level must be ${TECH_LEVELS.join('|')}`);
  }
  if (fm.scenario && !estimation.computed.scenarios[fm.scenario]) {
    out.push(`frontmatter: scenario "${fm.scenario}" not in estimation.json`);
  }
  checkValidUntil(fm.valid_until, today, out);
}

function checkValidUntil(raw, today, out) {
  if (!raw) return;
  const wellFormed = /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(raw));
  if (!wellFormed) { out.push('frontmatter: valid_until must be an ISO date (YYYY-MM-DD)'); return; }
  if (new Date(raw) <= today) out.push(`frontmatter: valid_until ${raw} is not in the future`);
}

function checkSections(md, out) {
  for (const name of SECTIONS) {
    const body = sectionText(md, name);
    if (body === null) { out.push(`missing ## ${name} section`); continue; }
    if (!body.trim()) out.push(`## ${name} section is empty`);
  }
  const solution = sectionText(md, 'Proposed Solution');
  if (solution !== null && !solution.includes('```mermaid')) {
    out.push('Proposed Solution has no mermaid diagram');
  }
}

function checkPlaceholders(md, out) {
  if (/\[TODO\]|\bTBD\b|\bTODO\b|lorem ipsum/i.test(md)) out.push('placeholder text found (TODO/TBD/lorem ipsum)');
  for (const t of tables(md)) {
    if (t.rows.length === 0) out.push(`empty table under header "${t.header.join(' | ')}"`);
  }
}

export function checkDoc({ fm, md, estimation, today }, out = []) {
  checkFrontmatter({ fm, estimation, today }, out);
  checkSections(md, out);
  checkPlaceholders(md, out);
  return out;
}
