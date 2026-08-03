import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCliArgs, UsageError, VALID_AGENTS } from './args.mjs';
import { loadRegistry } from './registry.mjs';
import { runPicker } from './picker.mjs';
import { installPlugin } from './install.mjs';
import { uninstallPlugin } from './uninstall.mjs';
import { ALL_AGENTS } from './agents.mjs';

const PACKAGE_ROOT = fileURLToPath(new URL('../..', import.meta.url));

export async function main(argv) {
  try {
    return await run(argv);
  } catch (err) {
    if (process.env.DEBUG) console.error(err.stack);
    else console.error(err.message);
    return 1;
  }
}

async function run(argv) {
  const args = parseCliArgs(argv);
  if (args.help) return printHelp();
  if (args.version) return printVersion();
  const registry = loadRegistry(path.join(PACKAGE_ROOT, 'plugins'));
  const plugins = await resolvePlugins(args, registry);
  const agents = await resolveAgents(args);
  if (!plugins.length || !agents.length) throw new UsageError('Nothing selected.');
  return execute({ args, plugins, agents });
}

async function resolvePlugins(args, registry) {
  const names = registry.map((p) => p.name);
  for (const name of args.plugins) {
    if (!names.includes(name)) {
      throw new UsageError(`Unknown plugin: ${name}. Available: ${names.join(', ')}`);
    }
  }
  if (args.plugins.length) return args.plugins.map((n) => registry.find((p) => p.name === n));
  requireInteractive();
  const picked = await runPicker({
    title: 'Select plugins:',
    items: registry.map((p) => ({ value: p.name, label: p.name, hint: p.description })),
  });
  if (picked === null) throw new UsageError('Cancelled.');
  return picked.map((n) => registry.find((p) => p.name === n));
}

async function resolveAgents(args) {
  if (args.agents.length) return args.agents;
  if (args.command === 'uninstall') return ALL_AGENTS;
  requireInteractive();
  const picked = await runPicker({
    title: 'Select agents:',
    items: VALID_AGENTS.map((a) => ({ value: a, label: a })),
  });
  if (picked === null) throw new UsageError('Cancelled.');
  return picked;
}

function requireInteractive() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new UsageError('Missing --plugin/--agent; interactive mode requires a TTY.');
  }
}

function execute({ args, plugins, agents }) {
  let skippedTotal = 0;
  for (const plugin of plugins) {
    const opts = { pluginDir: plugin.dir, cwd: process.cwd(), agents, force: args.force };
    const result = args.command === 'install' ? installPlugin(opts) : uninstallPlugin(opts);
    skippedTotal += printSummary(plugin.name, result);
  }
  return skippedTotal > 0 ? 1 : 0;
}

function printSummary(pluginName, result) {
  for (const item of result.reused ?? []) {
    console.log(`↻ ${item.skill} (canonical exists, reused)`);
  }
  for (const item of result.installed ?? []) {
    console.log(`✔ ${pluginName}: ${item.skill} → ${item.agent} (${item.mode})`);
    warnIfCopyFallback(item);
  }
  for (const item of result.removed ?? []) {
    console.log(`✔ ${pluginName}: removed ${item.skill} ← ${item.agent}`);
  }
  for (const skill of result.canonicalRemoved ?? []) {
    console.log(`✔ ${pluginName}: removed canonical ${skill}`);
  }
  for (const item of result.skipped ?? []) {
    console.error(`✖ skipped ${item.path} — ${item.reason}`);
  }
  return (result.skipped ?? []).length;
}

function warnIfCopyFallback(item) {
  if (item.mode !== 'copy') return;
  console.error(
    `⚠ ${item.skill} → ${item.agent} installed as plain copy — updates to .agents/skills will not propagate`,
  );
}

function printHelp() {
  console.log(`Usage: agents-rock [install|uninstall] [options]

Install plugin skills for Claude Code and Codex into the current project.

Options:
  -p, --plugin <name>   Plugin to install/uninstall (repeatable)
  -a, --agent <name>    Target agent: claude, codex (repeatable)
  -f, --force           Overwrite/remove collisions
  -h, --help            Show help
  -v, --version         Show version`);
  return 0;
}

function printVersion() {
  const pkg = JSON.parse(readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'));
  console.log(pkg.version);
  return 0;
}
