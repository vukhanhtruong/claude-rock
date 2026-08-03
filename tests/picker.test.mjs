import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPickerState, reduceKey, renderPicker } from '../src/cli/picker.mjs';

const ITEMS = [
  { value: 'a', label: 'alpha', hint: 'first' },
  { value: 'b', label: 'beta' },
];

test('cursor moves down and clamps at both ends', () => {
  let s = createPickerState(ITEMS);
  s = reduceKey(s, 'up');
  assert.equal(s.cursor, 0);
  s = reduceKey(s, 'down');
  assert.equal(s.cursor, 1);
  s = reduceKey(s, 'down');
  assert.equal(s.cursor, 1);
});

test('space toggles selection at cursor', () => {
  let s = createPickerState(ITEMS);
  s = reduceKey(s, 'space');
  assert.deepEqual([...s.selected], ['a']);
  s = reduceKey(s, 'space');
  assert.deepEqual([...s.selected], []);
});

test('unknown key leaves state unchanged', () => {
  const s = createPickerState(ITEMS);
  assert.equal(reduceKey(s, ''), s);
});

test('render shows cursor, checkboxes, hints', () => {
  let s = createPickerState(ITEMS);
  s = reduceKey(s, 'space');
  const out = renderPicker(s, 'Pick plugins');
  assert.match(out, /Pick plugins/);
  assert.match(out, /> \[x\] alpha {2}first/);
  assert.match(out, / {2}\[ \] beta/);
  assert.match(out, /space: toggle/);
});
