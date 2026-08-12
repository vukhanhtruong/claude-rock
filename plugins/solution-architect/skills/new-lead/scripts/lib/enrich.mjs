// scripts/lib/enrich.mjs
// new-lead-dashboard v2
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { leadDir } from './registry.mjs';

export async function enrichLead(root, lead) {
  const dir = leadDir(root, lead.id);
  const dist = join(dir, 'dist');
  return {
    ...lead,
    artifacts: {
      docs: existsSync(join(dist, 'index.html')),
      estimate: existsSync(join(dist, 'estimate.html')),
      proposal: existsSync(join(dist, 'proposal.html')),
    },
    hasBrief: existsSync(join(dir, 'brief.md')),
    hasNotes: existsSync(join(dir, 'notes.md')),
  };
}
