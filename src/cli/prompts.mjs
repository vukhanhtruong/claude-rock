import * as clack from '@clack/prompts';
import pc from 'picocolors';
import { AGENT_LABELS } from './agents.mjs';

const HINT_WIDTH = 64;
const clip = (text) => (text.length > HINT_WIDTH ? `${text.slice(0, HINT_WIDTH - 1)}…` : text);

/** Interactive shell around @clack/prompts. Holds no decisions — flow.mjs owns those. */
export function createPrompts() {
  return { pickPlugins, pickAgents, pickScope, confirmRoot, showSummary, confirmInstall };
}

async function pickPlugins(registry) {
  return unwrap(await clack.multiselect({
    message: 'Which plugins do you want?',
    options: registry.map((plugin) => ({
      value: plugin.name, label: plugin.name, hint: clip(plugin.description ?? ''),
    })),
    required: true,
  }));
}

async function pickAgents(agents) {
  return unwrap(await clack.multiselect({
    message: 'Which agents should get them?',
    options: agents.map((agent) => ({ value: agent, label: AGENT_LABELS[agent] ?? agent })),
    initialValues: agents,
    required: true,
  }));
}

async function pickScope() {
  return unwrap(await clack.select({
    message: 'Installation scope',
    options: [
      { value: 'project', label: 'Project', hint: 'this project only, committed with your repo' },
      { value: 'user', label: 'User', hint: 'your home dir, available in every project' },
    ],
  }));
}

async function confirmRoot({ detected, marker, cwd }) {
  if (!detected) {
    const ok = unwrap(await clack.confirm({
      message: `No project root found above ${pc.cyan(cwd)}. Install here anyway?`,
    }));
    return ok ? cwd : null;
  }
  return unwrap(await clack.select({
    message: 'Install into which directory?',
    options: [
      { value: detected, label: detected, hint: `project root — found ${marker}` },
      { value: cwd, label: cwd, hint: 'current directory' },
    ],
  }));
}

function showSummary(plan) {
  clack.note(summaryLines(plan).join('\n'), verb(plan) + ' summary');
}

async function confirmInstall(plan) {
  return unwrap(await clack.confirm({ message: `Proceed with ${verb(plan).toLowerCase()}?` }));
}

function summaryLines(plan) {
  const agents = plan.agents.map((agent) => AGENT_LABELS[agent] ?? agent).join(', ');
  const scope = plan.scope === 'user' ? 'user (home dir)' : `project (${plan.root})`;
  return [
    `${pc.dim('scope: ')}${scope}`,
    `${pc.dim('agents:')} ${agents}`,
    `${pc.dim('skills:')} ${pc.cyan(plan.targets.canonical)}`,
    ...plan.plugins.map((plugin) => `  ${plugin.name}`),
    ...plan.agents.map((agent) => `${pc.dim('link:  ')} ${plan.targets.agentDirs[agent]}`),
  ];
}

function verb(plan) {
  return plan.command === 'uninstall' ? 'Uninstall' : 'Install';
}

function unwrap(value) {
  return clack.isCancel(value) ? null : value;
}
