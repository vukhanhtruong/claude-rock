import { existsSync, lstatSync, rmSync } from 'node:fs';
import path from 'node:path';
import { listSkills } from './registry.mjs';

export function uninstallPlugin({ pluginDir, targets, agents, force = false }) {
  const result = { removed: [], canonicalRemoved: [], skipped: [] };
  for (const skill of listSkills(pluginDir)) {
    for (const agent of agents) {
      removeAgentEntry({ skill: skill.name, agent, targets, force, result });
    }
    maybeRemoveCanonical(skill.name, targets, result);
  }
  return result;
}

function removeAgentEntry({ skill, agent, targets, force, result }) {
  const linkPath = path.join(targets.agentDirs[agent], skill);
  let stat;
  try { stat = lstatSync(linkPath); } catch { return; }
  if (!stat.isSymbolicLink() && !force) {
    return result.skipped.push({ skill, agent, path: linkPath, reason: 'not a symlink (use --force)' });
  }
  rmSync(linkPath, { recursive: true, force: true });
  result.removed.push({ skill, agent });
}

function maybeRemoveCanonical(skill, targets, result) {
  const stillReferenced = Object.values(targets.agentDirs).some((dir) => {
    try { return Boolean(lstatSync(path.join(dir, skill))); }
    catch { return false; }
  });
  if (stillReferenced) return;
  const canonical = path.join(targets.canonical, skill);
  if (!existsSync(canonical)) return;
  rmSync(canonical, { recursive: true, force: true });
  result.canonicalRemoved.push(skill);
}
