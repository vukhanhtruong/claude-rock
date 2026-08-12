// scripts/lib/map.mjs
// new-lead-dashboard v3
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { leadDir, readRegistry } from './registry.mjs';

const run = promisify(execFile);
const X = { evidence: 0, arch: 480, estimate: 720, proposal: 960 };
const STEP_Y = 90;

// Everything the three skills write. What is left in the lead directory is what
// the human put there, which is exactly the evidence.
const GENERATED = new Set([
  'ARCHITECTURE.md', 'estimation.md', 'estimation.json', 'estimation-inputs.json',
  'proposal.md', 'proposal-figures.json', 'notes.md', 'brief.md', 'dist',
  'CONTEXT.md', 'CONTEXT-MAP.md', 'DOMAIN-OVERVIEW.md', 'threat-model.md', 'docs',
]);

export async function buildLeadMap(root, id) {
  const dir = leadDir(root, id);
  const src = await readSources(dir);
  const nodes = [...await evidenceNodes(dir), ...docNodes(id, dir, src)];
  layout(nodes);
  return { nodes, edges: edgesFor(nodes), panels: await panelsFor(root, id, src) };
}

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; }
}

async function readText(path) {
  try { return await readFile(path, 'utf8'); } catch { return null; }
}

async function readSources(dir) {
  const [arch, estimation, inputs, brief] = await Promise.all([
    readText(join(dir, 'ARCHITECTURE.md')),
    readJson(join(dir, 'estimation.json')),
    readJson(join(dir, 'estimation-inputs.json')),
    readText(join(dir, 'brief.md')),
  ]);
  return { arch, estimation, inputs, brief };
}

function isEvidence(entry) {
  return !entry.name.startsWith('.')
    && !GENERATED.has(entry.name)
    && !entry.name.endsWith('.c4');
}

async function evidenceNodes(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries.filter(isEvidence).map((entry) => ({
    id: `evidence-${entry.name}`,
    type: 'evidence',
    position: { x: 0, y: 0 },
    data: { label: entry.name, status: 'ready', href: null, detail: null },
  }));
}

function docNode(id, dir, spec) {
  const href = spec.exists && existsSync(join(dir, 'dist', spec.page))
    ? `/leads/${id}/dist/${spec.page}` : null;
  return {
    id: spec.key,
    type: 'doc',
    position: { x: 0, y: 0 },
    data: { label: spec.label, status: spec.exists ? 'ready' : 'pending', href, detail: null },
  };
}

function docNodes(id, dir, src) {
  const arch = docNode(id, dir, { key: 'arch', label: 'Architecture', page: 'index.html', exists: !!src.arch });
  const estimate = docNode(id, dir, { key: 'estimate', label: 'Estimate', page: 'estimate.html', exists: !!src.estimation });
  const proposal = docNode(id, dir, { key: 'proposal', label: 'Proposal', page: 'proposal.html', exists: existsSync(join(dir, 'proposal.md')) });
  return [arch, ...componentNodes(src.arch), estimate, ...scenarioNodes(src.estimation), proposal];
}

function sliceSection(archMd) {
  const start = archMd.match(/^##\s*6\..*$/m);
  if (!start) return '';
  const rest = archMd.slice(start.index + start[0].length);
  const end = rest.match(/^##\s/m);
  return end ? rest.slice(0, end.index) : rest;
}

function parseComponents(archMd) {
  if (!archMd) return [];
  const rows = sliceSection(archMd).split('\n').filter((l) => l.trim().startsWith('|'));
  return rows.slice(1)
    .filter((l) => !/^\|\s*-+\s*\|/.test(l.trim()))
    .map((l) => l.split('|')[1].trim().replace(/`/g, ''));
}

function componentNodes(archMd) {
  return parseComponents(archMd).map((name) => ({
    id: `component-${name}`,
    type: 'component',
    position: { x: 0, y: 0 },
    data: { label: name, status: 'ready', href: null, detail: null },
  }));
}

function scenarioNodes(est) {
  return (est?.scenarios ?? []).map((s) => ({
    id: `scenario-${s.id ?? s.name}`,
    type: 'scenario',
    position: { x: 0, y: 0 },
    data: { label: s.label ?? s.plan ?? String(s.id ?? s.name), status: 'ready', href: null, detail: null },
  }));
}

function edge(source, target) {
  return { id: `e-${source}-${target}`, source, target };
}

function edgesFor(nodes) {
  const has = (id) => nodes.some((n) => n.id === id);
  const link = (a, b) => (has(a) && has(b) ? [edge(a, b)] : []);
  const byPrefix = (prefix) => nodes.filter((n) => n.id.startsWith(prefix));
  return [
    ...byPrefix('evidence-').flatMap((n) => link(n.id, 'arch')),
    ...link('arch', 'estimate'),
    ...link('estimate', 'proposal'),
    ...byPrefix('component-').flatMap((n) => link('arch', n.id)),
    ...byPrefix('scenario-').flatMap((n) => link('estimate', n.id)),
  ];
}

function colX(n) {
  if (n.id.startsWith('evidence-')) return X.evidence;
  if (n.id === 'arch') return X.arch;
  if (n.id.startsWith('component-')) return X.arch + 40;
  if (n.id === 'estimate') return X.estimate;
  if (n.id.startsWith('scenario-')) return X.estimate + 40;
  return X.proposal;
}

function layout(nodes) {
  const y = new Map();
  for (const n of nodes) {
    const x = colX(n);
    const cur = y.get(x) ?? 0;
    n.position = { x, y: cur };
    y.set(x, cur + STEP_Y);
  }
}

function risksFor(est) {
  return (est?.risks ?? []).slice(0, 3).map((r) => r.name ?? r.title ?? String(r));
}

function openQuestionsFor(inputs) {
  return (inputs?.scope ?? [])
    .filter((s) => (s.provenance ?? s.label) === 'proposed')
    .map((s) => s.name ?? s.item);
}

async function activityFor(root, id) {
  try {
    const { stdout } = await run('git', ['-C', root, 'log', '--format=%as %s', '--', join('leads', id)]);
    return stdout.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

// facts is the registry entry itself — business metadata the dashboard displays.
// It is the only source for these fields now that the answers file is gone.
async function factsFor(root, id) {
  const registry = await readRegistry(root).catch(() => ({ leads: [] }));
  const lead = registry.leads.find((l) => l.id === id);
  if (!lead) return null;
  const { client, title, status, created, value, scenario } = lead;
  return { client, title, status, created, value, scenario };
}

async function panelsFor(root, id, src) {
  return {
    brief: src.brief ?? null,
    facts: await factsFor(root, id),
    risks: risksFor(src.estimation),
    openQuestions: openQuestionsFor(src.inputs),
    activity: await activityFor(root, id),
  };
}
