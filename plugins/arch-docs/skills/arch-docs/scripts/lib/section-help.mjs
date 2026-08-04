import { readFileSync } from 'node:fs';

// Verbatim from references/writing.md's 16-heading spine, in spine order. The
// lookup keys on this text rather than on a slug for two reasons: slugify keeps
// both spaces around a stripped "&", so "Goals & Scope" becomes goals--scope;
// and h2/h3 ids share one dedupe registry, so an h3 named Security under
// Crosscutting Concepts would take `security` and demote §12's h2 to security-2.
export const SPINE_TITLES = Object.freeze([
  'Goals & Scope', 'Constraints', 'Project Structure', 'Solution Strategy',
  'Architecture Model', 'Core Components', 'Runtime Behaviour', 'Data Stores',
  'External Integrations', 'Deployment & Infrastructure', 'Crosscutting Concepts',
  'Security', 'Quality Requirements & SLOs', 'Decisions',
  'Risks & Technical Debt', 'Glossary',
]);

export function sectionHelp() {
  const url = new URL('../../assets/section-help.json', import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8'));
}

// The result is spliced into an inline <script>, so a "</script" sequence
// anywhere in the prose would close the element early and inject the remainder
// as markup. Escaping "<" is enough to make that impossible and still parses as
// JSON. THEME gets away with a raw splice because a palette file is hex and
// keys; this is author-written sentences.
export function serialiseHelp(help) {
  return JSON.stringify(help).replace(/</g, '\\u003c');
}
