import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTree } from '../lib/validate-tree.mjs';

test('passes when boundary map matches filesystem', () => {
  const findings = validateTree({ boundaryRows: ['src/', 'docs'], fsDirs: ['src', 'docs'] });
  assert.deepEqual(findings, []);
});

test('fails documented dir missing from fs', () => {
  const findings = validateTree({ boundaryRows: ['src', 'src/legacy/'], fsDirs: ['src'] });
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /src\/legacy.*not found/);
});

test('fails fs dir absent from boundary map', () => {
  const findings = validateTree({ boundaryRows: ['src'], fsDirs: ['src', 'scripts'] });
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /scripts.*not documented/);
});

test('nested fs dir is covered by a documented ancestor', () => {
  const findings = validateTree({ boundaryRows: ['src'], fsDirs: ['src', 'src/billing'] });
  assert.deepEqual(findings, []);
});

test('a documented hidden dir that exists is not reported missing', () => {
  const findings = validateTree({
    boundaryRows: ['.claude-plugin', 'src'],
    fsDirs: ['src'],
    allDirs: ['.claude-plugin', 'src'],
  });
  assert.deepEqual(findings, []);
});

test('a hidden dir still does not have to be documented', () => {
  const findings = validateTree({
    boundaryRows: ['src'],
    fsDirs: ['src'],
    allDirs: ['.git', 'src'],
  });
  assert.deepEqual(findings, []);
});
