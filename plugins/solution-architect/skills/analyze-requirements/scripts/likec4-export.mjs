import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { PROJECT_NAME } from './lib/likec4-config.mjs';

// likec4.config.json names the project, so the workspace holds two projects
// (arch-docs + default) and a bare `export json` emits an **array** of project
// objects — a shape likec4-extract.mjs cannot read. --project pins the export
// to the single object the validator expects; this wrapper exists so the flag
// cannot be forgotten.
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[i + 1];
  }
  if (!args.dir || !args.out) {
    throw new Error('usage: likec4-export.mjs --dir <dir containing the .c4 sources> --out <model.json>');
  }
  return args;
}

function requireModelObject(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  if (Array.isArray(raw) || !raw?.elements) {
    throw new Error(`${path} is not a single-project model carrying .elements — was --project ${PROJECT_NAME} dropped?`);
  }
}

const args = parseArgs(process.argv.slice(2));
try {
  execFileSync('npx', ['likec4', 'export', 'json', '--project', PROJECT_NAME, '--outfile', args.out, args.dir], { stdio: 'inherit' });
} catch {
  throw new Error('likec4 export failed — the model JSON was not written');
}
requireModelObject(args.out);
console.log(args.out);
