import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { checkInputs } from './lib/schema.mjs';
import { computeEstimation } from './lib/rollup.mjs';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const inputs = JSON.parse(readFileSync(args.inputs, 'utf8'));
const findings = checkInputs(inputs);
if (findings.length) {
  console.error(findings.join('\n'));
  process.exit(1);
}
mkdirSync(dirname(args.out), { recursive: true });
writeFileSync(args.out, `${JSON.stringify(computeEstimation(inputs), null, 2)}\n`);
console.log(args.out);
