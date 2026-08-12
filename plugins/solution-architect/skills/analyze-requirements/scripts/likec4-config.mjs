import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildLikec4Config } from './lib/likec4-config.mjs';

// Written into the folder holding the .c4 sources, which is where LikeC4 looks
// for a project config — and which the skill generates, so the target repo keeps
// only markdown. Run before `likec4 gen webcomponent`; render.mjs refuses a
// bundle generated without it.
const argv = process.argv.slice(2);
const out = argv[argv.indexOf('--out') + 1];
if (!argv.includes('--out') || !out) {
  throw new Error('usage: likec4-config.mjs --out <dir containing the .c4 sources>');
}

const themeUrl = new URL('../assets/mermaid-theme.json', import.meta.url);
const config = buildLikec4Config(JSON.parse(readFileSync(themeUrl, 'utf8')));
const path = join(out, 'likec4.config.json');
writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
console.log(path);
