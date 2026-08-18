import { parseArgs } from 'node:util';
import { ALL_AGENTS } from './agents.mjs';

export class UsageError extends Error {}

const COMMANDS = new Set(['install', 'uninstall']);

const OPTIONS = {
  plugin: { type: 'string', multiple: true, short: 'p' },
  agent: { type: 'string', multiple: true, short: 'a' },
  global: { type: 'boolean', short: 'g' },
  project: { type: 'boolean' },
  dir: { type: 'string' },
  yes: { type: 'boolean', short: 'y' },
  force: { type: 'boolean', short: 'f' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
};

export function parseCliArgs(argv) {
  const { values, positionals } = tryParse(argv);
  const command = positionals[0] ?? 'install';
  if (!COMMANDS.has(command)) throw new UsageError(`Unknown command: ${command}`);
  if (positionals.length > 1) throw new UsageError(`Unexpected argument: ${positionals[1]}`);
  validateAgents(values.agent ?? []);
  return {
    command,
    plugins: values.plugin ?? [],
    agents: values.agent ?? [],
    scope: resolveScope(values),
    dir: values.dir ?? null,
    yes: values.yes ?? false,
    force: values.force ?? false,
    help: values.help ?? false,
    version: values.version ?? false,
  };
}

function tryParse(argv) {
  try {
    return parseArgs({ args: argv, options: OPTIONS, allowPositionals: true });
  } catch (err) {
    throw new UsageError(err.message);
  }
}

function resolveScope(values) {
  if (values.global && values.project) {
    throw new UsageError('Pass either --global or --project, not both.');
  }
  if (values.global && values.dir) {
    throw new UsageError('--dir names a project directory, so it cannot be used with --global.');
  }
  if (values.global) return 'user';
  if (values.project || values.dir) return 'project';
  return null;
}

function validateAgents(agents) {
  for (const agent of agents) {
    if (!ALL_AGENTS.includes(agent)) {
      throw new UsageError(`Unknown agent: ${agent}. Valid agents: ${ALL_AGENTS.join(', ')}`);
    }
  }
}
