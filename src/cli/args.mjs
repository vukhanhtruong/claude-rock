import { parseArgs } from 'node:util';

export class UsageError extends Error {}

export const VALID_AGENTS = ['claude', 'codex'];
const COMMANDS = new Set(['install', 'uninstall']);

const OPTIONS = {
  plugin: { type: 'string', multiple: true, short: 'p' },
  agent: { type: 'string', multiple: true, short: 'a' },
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

function validateAgents(agents) {
  for (const agent of agents) {
    if (!VALID_AGENTS.includes(agent)) {
      throw new UsageError(`Unknown agent: ${agent}. Valid agents: ${VALID_AGENTS.join(', ')}`);
    }
  }
}
