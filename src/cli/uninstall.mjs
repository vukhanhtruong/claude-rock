import { existsSync, lstatSync, rmSync } from 'node:fs';
import path from 'node:path';
import { listSkills } from './registry.mjs';
import { agentSkillsDir, canonicalSkillsDir, ALL_AGENTS } from './agents.mjs';

export function uninstallPlugin({ pluginDir, cwd, agents, force = false }) {
  const result = { removed: [], canonicalRemoved: [], skipped: [] };
  for (const skill of listSkills(pluginDir)) {
    for (const agent of agents) {
      removeAgentEntry({ skill: skill.name, agent, cwd, force, result });
    }
    maybeRemoveCanonical(skill.name, cwd, result);
  }
  return result;
}

function removeAgentEntry({ skill, agent, cwd, force, result }) {
  const linkPath = path.join(agentSkillsDir(agent, cwd), skill);
  let stat;
  try { stat = lstatSync(linkPath); } catch { return; }
  if (!stat.isSymbolicLink() && !force) {
    return result.skipped.push({ skill, agent, path: linkPath, reason: 'not a symlink (use --force)' });
  }
  rmSync(linkPath, { recursive: true, force: true });
  result.removed.push({ skill, agent });
}

function maybeRemoveCanonical(skill, cwd, result) {
  const stillReferenced = ALL_AGENTS.some((agent) => {
    try { return Boolean(lstatSync(path.join(agentSkillsDir(agent, cwd), skill))); }
    catch { return false; }
  });
  if (stillReferenced) return;
  const canonical = path.join(canonicalSkillsDir(cwd), skill);
  if (!existsSync(canonical)) return;
  rmSync(canonical, { recursive: true, force: true });
  result.canonicalRemoved.push(skill);
}
