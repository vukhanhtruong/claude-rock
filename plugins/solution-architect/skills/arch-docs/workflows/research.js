export const meta = {
  name: 'arch-docs-research',
  description: 'Domain, stack, and per-aspect design research with provenance',
  phases: [
    { title: 'Domain', detail: 'concepts + comparable systems' },
    { title: 'Stack', detail: 'verify stated claims, integration facts' },
    { title: 'Design', detail: 'greenfield per-aspect proposals' },
  ],
}

const FACTS = { type: 'object', required: ['facts'], properties: { facts: { type: 'array', items: {
  type: 'object', required: ['fact', 'provenance', 'source'],
  properties: { fact: { type: 'string' }, provenance: { type: 'string' }, source: { type: 'string' } },
} } } }

const dropped = []
const keep = (label) => (r) => {
  if (r) return r.facts
  dropped.push({ item: label, reason: 'agent returned nothing' })
  log(`DROPPED ${label}: agent returned nothing`)
  return []
}

phase('Domain')
const domainBriefs = [
  `Research the ${args.domain} domain: core concepts, canonical vocabulary, regulatory constraints. Cite sources. Every fact gets provenance "researched" and a source URL.`,
  `Find 2-3 comparable ${args.domain} systems and their published architectures. Cite sources.`,
]
const domain = (await parallel(domainBriefs.map((p, i) => () =>
  agent(p, { label: `domain-${i}`, phase: 'Domain', schema: FACTS }).then(keep(`domain-${i}`))
))).flat()

phase('Stack')
const stackJobs = [
  ...args.statedFacts.map((f) => `Verify this stated claim: "${f.claim}". If verifiable, return it as provenance "researched" with source; if not, return it as provenance "stated" with source "unverified".`),
  ...args.gaps.map((g) => `Research integration facts for ${g}: auth method, rate limits, pricing tier, failure modes. Provenance "researched" with sources.`),
]
const stack = (await parallel(stackJobs.map((p, i) => () =>
  agent(p, { label: `stack-${i}`, phase: 'Stack', schema: FACTS }).then(keep(`stack-${i}`))
))).flat()

let aspects = []
if (args.mode === 'greenfield') {
  phase('Design')
  const aspectNames = ['components', 'data', 'deployment', 'security']
  aspects = (await parallel(aspectNames.map((a) => () =>
    agent(
      `Propose the ${a} design for a ${args.projectType} ${args.domain} system, constrained by these researched facts: ${JSON.stringify(domain.slice(0, 20))}. Every proposal gets provenance "proposed", source "this workflow".`,
      { label: `design-${a}`, phase: 'Design', schema: FACTS },
    ).then(keep(`design-${a}`))
  ))).flat()
} else {
  log('brownfield mode: per-aspect design skipped, scan owns observed facts')
}

log(`research done: ${domain.length} domain, ${stack.length} stack, ${aspects.length} proposed, ${dropped.length} dropped`)
return { domain, stack, aspects, dropped }
