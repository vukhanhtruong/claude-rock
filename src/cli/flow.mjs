import { homedir } from 'node:os';
import path from 'node:path';
import { UsageError } from './args.mjs';
import { ALL_AGENTS } from './agents.mjs';
import { findProjectRoot } from './scope.mjs';
import { resolveTargets } from './targets.mjs';

/**
 * Turn flags plus prompt answers into a fully resolved install plan.
 * Returns null when the user cancels or declines, so callers exit cleanly.
 */
export async function buildPlan({ args, registry, prompts, ctx }) {
  const input = withDefaults({ args, registry, prompts, ctx });
  const plugins = await selectPlugins(input);
  if (!plugins) return null;
  const agents = await selectAgents(input);
  if (!agents) return null;
  const scope = await selectScope(input);
  if (!scope) return null;
  const root = scope === 'project' ? await selectRoot(input) : null;
  if (scope === 'project' && !root) return null;
  return confirmPlan(input, { plugins, agents, scope, root });
}

function withDefaults({ args, registry, prompts, ctx }) {
  const full = { cwd: ctx.cwd, stopAt: ctx.stopAt, isTTY: ctx.isTTY ?? false,
    home: ctx.home ?? homedir(), env: ctx.env ?? process.env };
  return { args, registry, prompts, ctx: full, interactive: full.isTTY && !args.yes };
}

async function confirmPlan({ args, prompts, ctx }, selection) {
  const { scope, root } = selection;
  const targets = resolveTargets({ scope, root, home: ctx.home, env: ctx.env });
  const plan = { ...selection, targets, command: args.command, force: args.force };
  prompts.showSummary(plan);
  if (args.yes || !ctx.isTTY) return plan;
  return (await prompts.confirmInstall(plan)) ? plan : null;
}

async function selectPlugins({ args, registry, prompts, interactive }) {
  if (args.plugins.length) return args.plugins.map((name) => findPlugin(registry, name));
  if (!interactive) {
    throw new UsageError('Missing --plugin. Pass --plugin <name>, or run in a terminal to pick.');
  }
  const picked = await prompts.pickPlugins(registry);
  return picked?.length ? picked.map((name) => findPlugin(registry, name)) : null;
}

async function selectAgents({ args, prompts, interactive }) {
  if (args.agents.length) return args.agents;
  if (args.command === 'uninstall') return ALL_AGENTS;
  if (!interactive) {
    throw new UsageError(`Missing --agent. Pass --agent ${ALL_AGENTS.join('|')}, or run in a terminal to pick.`);
  }
  const picked = await prompts.pickAgents(ALL_AGENTS);
  return picked?.length ? picked : null;
}

async function selectScope({ args, prompts, interactive }) {
  if (args.scope) return args.scope;
  if (args.dir || args.yes) return 'project';
  if (!interactive) {
    throw new UsageError('Missing install scope. Pass --global for your home dir or --project for this project.');
  }
  return prompts.pickScope();
}

async function selectRoot({ args, prompts, ctx, interactive }) {
  if (args.dir) return path.resolve(args.dir);
  const found = findProjectRoot(ctx.cwd, ctx.stopAt);
  if (!interactive) return found?.root ?? ctx.cwd;
  if (found?.root === ctx.cwd) return ctx.cwd;
  return prompts.confirmRoot({
    detected: found?.root ?? null,
    marker: found?.marker ?? null,
    cwd: ctx.cwd,
  });
}

function findPlugin(registry, name) {
  const plugin = registry.find((entry) => entry.name === name);
  if (plugin) return plugin;
  const names = registry.map((entry) => entry.name).join(', ');
  throw new UsageError(`Unknown plugin: ${name}. Available: ${names}`);
}
