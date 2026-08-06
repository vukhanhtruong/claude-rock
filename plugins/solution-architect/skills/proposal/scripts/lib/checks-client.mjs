// Client-safety half of the proposal gate: every number traces to the
// derived figures, nothing internal leaks, and non-tech documents carry no
// jargon outside the About section.
import { deriveFigures } from './figures.mjs';
import { sectionText, escapeRegExp } from './sections.mjs';
import { JARGON } from './jargon.mjs';

const flat = (f) => [
  f.cost.low, f.cost.high, f.months.low, f.months.high,
  ...f.milestones.flatMap((m) => [m.cost.low, m.cost.high, m.months.low, m.months.high]),
];

function checkMoney(md, figures, out) {
  const allowed = new Set(flat(figures));
  for (const m of md.matchAll(/[$€£]\s?([\d,]+(?:\.\d+)?)/g)) {
    const n = Number(m[1].replaceAll(',', ''));
    if (!allowed.has(n)) out.push(`money amount ${m[0].trim()} not derived from estimation.json`);
  }
  for (const m of md.matchAll(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s+months/g)) {
    for (const bound of [Number(m[1]), Number(m[2])]) {
      if (!allowed.has(bound)) out.push(`duration bound ${bound} months not derived from estimation.json`);
    }
  }
}

function checkHeadline(md, figures, out) {
  for (const n of [figures.cost.low, figures.cost.high]) {
    if (!md.includes(n.toLocaleString('en-US'))) out.push(`headline cost bound ${n.toLocaleString('en-US')} missing`);
  }
  for (const n of [figures.months.low, figures.months.high]) {
    if (!new RegExp(`\\b${escapeRegExp(String(n))}\\b`).test(md)) out.push(`headline duration bound ${n} missing`);
  }
}

function checkLeaks({ md, fm, estimation }, out) {
  for (const s of estimation.inputs.scenarios ?? []) {
    if (s.id !== fm.scenario && md.includes(s.id)) out.push(`leak: scenario id "${s.id}"`);
  }
  if (/\|\s*src\s*\|/i.test(md)) out.push('leak: provenance "src" column');
  if (/data-internal/.test(md)) out.push('leak: data-internal marker');
  for (const word of ['observed', 'researched']) {
    if (new RegExp(`\\|\\s*${word}\\s*\\|`).test(md)) out.push(`leak: provenance cell "${word}"`);
  }
}

function checkJargon({ md, fm }, out) {
  if (fm.client_tech_level !== 'non-tech') return;
  const allow = new Set((Array.isArray(fm.jargon_allow) ? fm.jargon_allow : []).map((w) => w.toLowerCase()));
  const about = sectionText(md, 'About');
  const scanned = md.replace(/^---\n[\s\S]*?\n---/, '').replace(about ?? '', '');
  for (const term of JARGON) {
    if (allow.has(term)) continue;
    if (new RegExp(`(?<![\\w/])${escapeRegExp(term)}(?:e?s)?(?![\\w/])`, 'i').test(scanned)) {
      out.push(`jargon for a non-tech client: "${term}" (rewrite plainly or add to jargon_allow)`);
    }
  }
}

export function checkClient({ md, fm, estimation }, out = []) {
  const figures = deriveFigures(estimation, fm.scenario);
  checkMoney(md, figures, out);
  checkHeadline(md, figures, out);
  checkLeaks({ md, fm, estimation }, out);
  checkJargon({ md, fm }, out);
  return out;
}
