import { test } from 'node:test';
import assert from 'node:assert/strict';
import { likec4Steps } from '../lib/likec4-steps.mjs';

const steps = likec4Steps({ dir: '/m', out: '/b.js' });

// `likec4 gen webcomponent` is not a validation gate. It generated a 2.2 MB
// bundle from a workspace carrying 194 validation errors — duplicate element ids
// from two conflicting `specification` blocks — without a word, exit 0. Prose
// telling the next reader to run `validate` first is the same kind of invariant
// the palette bug was: correct, unenforced, and skipped in the one run that
// mattered. Order is the whole product of this module.
test('validate runs before anything is generated', () => {
  const names = steps.map(([, argv]) => argv[0]);
  assert.deepEqual(names, ['validate', 'gen']);
});

test('both steps address the same model directory', () => {
  for (const [, argv] of steps) assert.ok(argv.includes('/m'), `${argv[0]} lost the model dir`);
});

// Omitting the prefix yields <likec4-view> instead of <c4-view>: the template's
// markers never match and every diagram renders blank, with no error anywhere.
test('the generate step pins the custom-element prefix', () => {
  const [, argv] = steps[1];
  assert.deepEqual(argv.slice(0, 4), ['gen', 'webcomponent', '--webcomponent-prefix', 'c4']);
  assert.ok(argv.includes('--outfile') && argv.includes('/b.js'));
});

test('every step is a likec4 invocation', () => {
  for (const [bin] of steps) assert.equal(bin, 'likec4');
});
