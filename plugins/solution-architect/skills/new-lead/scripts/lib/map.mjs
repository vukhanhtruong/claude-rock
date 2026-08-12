// scripts/lib/map.mjs
// new-lead-dashboard v1
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

const run = promisify(execFile);
const X = { evidence: 0, interview: 240, arch: 480, estimate: 720, proposal: 960 };
const STEP_Y = 90;

export async function buildLeadMap(root, id) {
  const dir = join(root, id);
  const src = await readSources(dir);
  const nodes = [...evidenceNodes(src), interviewNode(src), ...docNodes(id, dir, src)];
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
  const [answers, arch, estimation, inputs, brief] = await Promise.all([
    readJson(join(dir, 'new-lead-answers.json')),
    readText(join(dir, 'ARCHITECTURE.md')),
    readJson(join(dir, 'estimation.json')),
    readJson(join(dir, 'estimation-inputs.json')),
    readText(join(dir, 'brief.md')),
  ]);
  return { answers, arch, estimation, inputs, brief };
}

function evidenceNodes(src) {
  return (src.answers?.evidence?.sources ?? []).map((s, i) => ({
    id: `evidence-${i}`,
    type: 'evidence',
    position: { x: 0, y: 0 },
    data: { label: s.type ?? `evidence-${i}`, status: 'ready', href: null, detail: s.summary ?? null },
  }));
}

function interviewNode(src) {
  return {
    id: 'interview',
    type: 'interview',
    position: { x: 0, y: 0 },
    data: {
      label: 'Interview',
      status: src.answers ? 'ready' : 'pending',
      href: null,
      detail: src.answers?.scope?.summary ?? null,
    },
  };
}

function docNode(id, dir, spec) {
  const href = spec.exists && existsSync(join(dir, 'dist', spec.page))
    ? `/${id}/dist/${spec.page}` : null;
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
    ...byPrefix('evidence-').flatMap((n) => link(n.id, 'interview')),
    ...link('interview', 'arch'),
    ...link('arch', 'estimate'),
    ...link('estimate', 'proposal'),
    ...byPrefix('component-').flatMap((n) => link('arch', n.id)),
    ...byPrefix('scenario-').flatMap((n) => link('estimate', n.id)),
  ];
}

function colX(n) {
  if (n.id.startsWith('evidence-')) return X.evidence;
  if (n.id === 'interview') return X.interview;
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
    const { stdout } = await run('git', ['-C', root, 'log', '--format=%as %s', '--', id]);
    return stdout.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

// facts.client is the answers-file `client` group — industry, contact, techLevel,
// relationship. It holds no company name: that is registry truth (`lead.client`),
// which the detail page already has in scope and reads from there.
async function panelsFor(root, id, src) {
  return {
    brief: src.brief ?? null,
    facts: {
      client: src.answers?.client ?? {},
      tech: src.answers?.tech ?? {},
      delivery: src.answers?.delivery ?? {},
    },
    risks: risksFor(src.estimation),
    openQuestions: openQuestionsFor(src.inputs),
    activity: await activityFor(root, id),
  };
}
