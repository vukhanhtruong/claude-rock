import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCliArgs } from './args.mjs';
import { loadRegistry } from './registry.mjs';
import { buildPlan } from './flow.mjs';
import { createPrompts } from './prompts.mjs';
import { installPlugin } from './install.mjs';
import { uninstallPlugin } from './uninstall.mjs';
import { printResult } from './report.mjs';

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
  const plan = await buildPlan({ args, registry, prompts: createPrompts(), ctx: processCtx() });
  if (!plan) {
    console.log('Cancelled.');
    return 0;
  }
  return execute(plan);
}

function processCtx() {
  return {
    cwd: process.cwd(),
    home: homedir(),
    env: process.env,
    isTTY: Boolean(process.stdin.isTTY && process.stdout.isTTY),
  };
}

function execute(plan) {
  let skippedTotal = 0;
  for (const plugin of plan.plugins) {
    const opts = {
      pluginDir: plugin.dir, targets: plan.targets, agents: plan.agents, force: plan.force,
    };
    const result = plan.command === 'install' ? installPlugin(opts) : uninstallPlugin(opts);
    skippedTotal += printResult(plugin.name, result);
  }
  return skippedTotal > 0 ? 1 : 0;
}

function printHelp() {
  console.log(`Usage: agents-rock [install|uninstall] [options]

Install plugin skills for Claude Code and Codex. Run with no options for an
interactive picker; pass flags to run unattended.

Options:
  -p, --plugin <name>   Plugin to install/uninstall (repeatable)
  -a, --agent <name>    Target agent: claude, codex (repeatable)
  -g, --global          User scope: install under your home directory
      --project         Project scope: install under the detected project root
      --dir <path>      Project scope into <path>, skipping root detection
  -y, --yes             Skip confirmations (assumes --project)
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
