import { mkdtempSync, mkdirSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const REGISTRY = [
  { name: 'lmk', description: 'visual explainer', dir: '/pkg/plugins/lmk' },
  { name: 'solution-architect', description: 'architecture', dir: '/pkg/plugins/sa' },
];

export function argsFor(overrides = {}) {
  return {
    command: 'install', plugins: [], agents: [], scope: null,
    dir: null, yes: false, force: false, ...overrides,
  };
}

export function stubPrompts(answers = {}) {
  const calls = [];
  const answer = (name, fallback) => (answers[name] === undefined ? fallback : answers[name]);
  return {
    calls,
    pickPlugins: async () => (calls.push('pickPlugins'), answer('plugins', ['lmk'])),
    pickAgents: async () => (calls.push('pickAgents'), answer('agents', ['claude'])),
    pickScope: async () => (calls.push('pickScope'), answer('scope', 'project')),
    confirmRoot: async (info) => (calls.push('confirmRoot'), answer('root', info.detected)),
    showSummary: () => calls.push('showSummary'),
    confirmInstall: async () => (calls.push('confirmInstall'), answer('proceed', true)),
  };
}

export function ctxFor(t, overrides = {}) {
  const base = realpathSync(mkdtempSync(path.join(tmpdir(), 'agents-rock-flow-')));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const cwd = path.join(base, 'repo');
  mkdirSync(path.join(cwd, '.git'), { recursive: true });
  return { base, ctx: { cwd, home: base, env: {}, isTTY: true, stopAt: base, ...overrides } };
}

export function subdir(parent, ...segments) {
  const dir = path.join(parent, ...segments);
  mkdirSync(dir, { recursive: true });
  return dir;
}
