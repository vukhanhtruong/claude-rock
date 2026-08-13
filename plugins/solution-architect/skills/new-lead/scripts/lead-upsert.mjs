// scripts/lead-upsert.mjs
// new-lead-dashboard v1
import { parseArgs } from 'node:util';
import { readRegistry, writeRegistry } from './lib/registry.mjs';

const DEFAULTS = { client: null, status: 'active', closed: null, value: null, scenario: null };

const { values } = parseArgs({
  options: { root: { type: 'string' }, id: { type: 'string' }, patch: { type: 'string' } },
});
if (!values.root || !values.id || !values.patch) {
  console.error('usage: lead-upsert.mjs --root <dir> --id <lead-id> --patch <json>');
  process.exit(2);
}

const patch = JSON.parse(values.patch);
const registry = await readRegistry(values.root);
const index = registry.leads.findIndex((l) => l.id === values.id);
const existing = index === -1 ? {} : registry.leads[index];
const merged = { ...DEFAULTS, ...existing, ...patch, id: values.id };

if (index === -1) registry.leads.push(merged);
else registry.leads[index] = merged;

try {
  await writeRegistry(values.root, registry);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
console.log(JSON.stringify(merged));
