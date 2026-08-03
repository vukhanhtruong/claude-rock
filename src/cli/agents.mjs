import path from 'node:path';

export const AGENT_DIRS = { claude: '.claude', codex: '.codex' };
export const ALL_AGENTS = Object.keys(AGENT_DIRS);

export function agentSkillsDir(agent, cwd) {
  return path.join(cwd, AGENT_DIRS[agent], 'skills');
}

export function canonicalSkillsDir(cwd) {
  return path.join(cwd, '.agents', 'skills');
}
