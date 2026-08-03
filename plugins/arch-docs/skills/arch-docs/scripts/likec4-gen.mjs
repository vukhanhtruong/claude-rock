import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { likec4Steps } from './lib/likec4-steps.mjs';

// Validate, then generate — one command, because two commands is how the
// validate step got skipped. See lib/likec4-steps.mjs for why gen alone is not
// a gate.
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[i + 1];
  }
  if (!args.dir || !args.out) {
    throw new Error('usage: likec4-gen.mjs --dir <dir containing the .c4 sources> --out <bundle>');
  }
  return args;
}

// Checked here rather than left to render.mjs, which finds it only after the
// bundle has been built: without the config LikeC4 paints its default blue, and
// that model still validates and still generates clean.
function requireConfig(dir) {
  if (existsSync(join(dir, 'likec4.config.json'))) return;
  throw new Error(`${dir} has no likec4.config.json — run scripts/likec4-config.mjs --out ${dir}`);
}

function run([bin, argv]) {
  try {
    execFileSync('npx', [bin, ...argv], { stdio: 'inherit' });
  } catch {
    throw new Error(`likec4 ${argv[0]} failed — the bundle was not written`);
  }
}

const args = parseArgs(process.argv.slice(2));
requireConfig(args.dir);
for (const step of likec4Steps(args)) run(step);
console.log(args.out);
