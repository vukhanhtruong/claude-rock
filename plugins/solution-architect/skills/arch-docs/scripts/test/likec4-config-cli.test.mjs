import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLI = 'plugins/solution-architect/skills/arch-docs/scripts/likec4-config.mjs';
const theme = JSON.parse(readFileSync(
  new URL('../../assets/mermaid-theme.json', import.meta.url), 'utf8'));

// LikeC4 reads the project config from the folder holding the .c4 sources, so
// this has to land beside the model — which the skill generates, which is why
// the plugin can own it at all.
test('the CLI writes likec4.config.json beside the model', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arch-docs-c4-'));
  const out = execFileSync('node', [CLI, '--out', dir], { encoding: 'utf8' }).trim();
  assert.equal(out, join(dir, 'likec4.config.json'));
  const cfg = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(cfg.styles.theme.colors.primary, theme.likec4.brand);
  assert.equal(cfg.styles.defaults.color, 'primary');
});

test('the CLI fails loudly without a target directory', () => {
  assert.throws(() => execFileSync('node', [CLI], { stdio: 'pipe' }));
});
