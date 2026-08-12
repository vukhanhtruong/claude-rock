// new-lead-dashboard v1
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { validateRegistry } from './lib/registry.mjs';

const { values } = parseArgs({ options: { file: { type: 'string' } } });
if (!values.file) { console.error('usage: validate.mjs --file <leads.json>'); process.exit(2); }
const findings = validateRegistry(JSON.parse(await readFile(values.file, 'utf8')));
if (findings.length) { findings.forEach(f => console.log(f)); process.exit(1); }
