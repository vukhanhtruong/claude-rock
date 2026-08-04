import { basename } from 'node:path';

// The three companions with fixed basenames. interface-contract is absent on
// purpose: its filename is stack-dependent (OpenAPI, tool schemas, data
// contracts, a wire protocol), and if it ships as raw .yaml or .proto it never
// reaches renderMarkdown at all. Excluded rather than guessed at.
const COMPANIONS = new Map([
  ['threat-model.md', 'threat-model'],
  ['estimation.md', 'estimation'],
  ['domain-overview.md', 'domain-overview'],
]);

// Position, not filename, identifies the spine: render.mjs passes ARCHITECTURE.md
// as docs[0] and a target repo may call it anything. Everything unmatched returns
// undefined and renders exactly as it does today — ADRs, CONTEXT.md,
// CONTEXT-MAP.md and the interface contract are all excluded by the spec.
export function kindOf(path, index) {
  if (index === 0) return 'spine';
  return COMPANIONS.get(basename(path).toLowerCase());
}
