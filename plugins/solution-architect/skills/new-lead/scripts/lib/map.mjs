// scripts/lib/map.mjs
// new-lead-dashboard v6
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { leadDir, readRegistry } from './registry.mjs';
import { leadNodes } from './map-nodes.mjs';

const run = promisify(execFile);
const X = { evidence: 0, arch: 480, estimate: 720, proposal: 960, page: 1200 };
const STEP_Y = 90;

export async function buildLeadMap(root, id) {
  const dir = leadDir(root, id);
  const src = await readSources(dir);
  const nodes = await leadNodes(id, dir, src);
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

function edge(source, target) {
  return { id: `e-${source}-${target}`, source, target };
}

function edgesFor(nodes) {
  const ids = new Set(nodes.map((n) => n.id));
  const link = (a, b) => (ids.has(a) && ids.has(b) ? [edge(a, b)] : []);
  const byPrefix = (prefix) => nodes.filter((n) => n.id.startsWith(prefix));
  return [
    ...byPrefix('evidence-').flatMap((n) => link(n.id, 'arch')),
    ...link('arch', 'estimate'),
    ...link('estimate', 'proposal'),
    ...byPrefix('component-').flatMap((n) => link('arch', n.id)),
    ...byPrefix('scenario-').flatMap((n) => link('estimate', n.id)),
    // proposal-family mds (ids are their filenames, e.g. proposal-non-tech.md)
    ...byPrefix('proposal').filter((n) => n.id !== 'proposal')
      .flatMap((n) => link('estimate', n.id)),
  ];
}

function colX(n) {
  if (n.id.startsWith('evidence-')) return X.evidence;
  if (n.id === 'arch') return X.arch;
  if (n.id.startsWith('component-')) return X.arch + 40;
  if (n.id === 'estimate') return X.estimate;
  if (n.id.startsWith('scenario-')) return X.estimate + 40;
  if (n.id.startsWith('page-')) return X.page;
  return X.proposal; // the named proposal node plus proposal-family mds
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
