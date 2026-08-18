/**
 * Per-agent home directory plus the env var that relocates it. Both are only
 * consulted for user scope; project scope always nests inside the project root.
 */
export const AGENT_HOMES = {
  claude: { dir: '.claude', env: 'CLAUDE_CONFIG_DIR' },
  codex: { dir: '.codex', env: 'CODEX_HOME' },
};

export const ALL_AGENTS = Object.keys(AGENT_HOMES);

export const AGENT_LABELS = { claude: 'Claude Code', codex: 'Codex' };
