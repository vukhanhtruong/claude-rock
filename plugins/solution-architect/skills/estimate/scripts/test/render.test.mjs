import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inlineModule, stripInternal } from '../lib/inline.mjs';

const tpl = () => readFileSync(new URL('../../assets/estimate-template.html', import.meta.url), 'utf8');
const cli = new URL('../render.mjs', import.meta.url).pathname;
const fixture = new URL('./fixtures/booking-inputs.json', import.meta.url).pathname;
const passMd = new URL('./fixtures/estimation-pass.md', import.meta.url).pathname;
const computeCli = new URL('../compute.mjs', import.meta.url).pathname;

function renderedPage(extra = []) {
  const dir = mkdtempSync(join(tmpdir(), 'estimate-render-'));
  const json = join(dir, 'estimation.json');
  execFileSync('node', [computeCli, '--inputs', fixture, '--out', json]);
  execFileSync('node', [cli, '--json', json, '--md', passMd, '--out', dir, ...extra]);
  return readFileSync(join(dir, 'estimate.html'), 'utf8');
}

test('render refuses a deliverable that fails validation', () => {
  const failMd = new URL('./fixtures/estimation-fail.md', import.meta.url).pathname;
  const dir = mkdtempSync(join(tmpdir(), 'estimate-render-'));
  const json = join(dir, 'estimation.json');
  execFileSync('node', [computeCli, '--inputs', fixture, '--out', json]);
  assert.throws(() => execFileSync('node', [cli, '--json', json, '--md', failMd, '--out', dir]));
});

test('template carries exactly the four slots and no external URLs', () => {
  const markers = [...tpl().matchAll(/<!-- slot:(\w+) -->/g)].map((m) => m[1]).sort();
  assert.deepEqual([...new Set(markers)], ['DATA', 'FONTS', 'MATH', 'TITLE']);
  assert.doesNotMatch(tpl(), /https?:\/\/(?!www\.w3\.org)/);
});

test('inlineModule strips export keywords and nothing else', () => {
  assert.equal(inlineModule('export function f() {}\nexport const X = 1;\nconst y = 2;'),
    'function f() {}\nconst X = 1;\nconst y = 2;');
});

test('rendered page is self-contained and carries parseable data', () => {
  const html = renderedPage();
  assert.doesNotMatch(html, /<!-- slot:/);
  assert.match(html, /@font-face/);
  const data = html.match(/<script type="application\/json" id="estimation-data">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(data).inputs.project, 'Booking App');
  assert.match(html, /function pert\(/); // math inlined, not referenced
});

test('the page carries a method section with source attributions', () => {
  const html = renderedPage();
  assert.match(html, /id="method"/);
  assert.match(html, /atomicobject\.com/); // sources cited in the page, not only in refs
  assert.match(html, /kmino\.io/);
});

test('the method section comes first — how before how-much', () => {
  assert.match(tpl(), /<div class="col">\s*<section id="method">/);
});

test('--client-only strips every internal range', () => {
  const html = renderedPage(['--client-only']);
  assert.doesNotMatch(html, /data-internal|internal:start|ctl-engineers/);
  assert.match(stripInternal('a<!-- internal:start -->X<!-- internal:end -->b'), /^ab$/);
});

test('--client-only redacts rates and cost breakdown unless exposeRatesToClient is set', () => {
  // Matched as quoted JSON keys, not bare identifiers: estimate-math.mjs is
  // inlined verbatim for the what-if engine and legitimately declares
  // `laborCost`/`planCost` as plain JS locals in every render, client or not.
  const html = renderedPage(['--client-only']);
  assert.doesNotMatch(html, /"rate":/);
  assert.doesNotMatch(html, /"laborCost":/);
  assert.doesNotMatch(html, /"planCost":/);
});

test('--client-only keeps rates when exposeRatesToClient is true', () => {
  const dir = mkdtempSync(join(tmpdir(), 'estimate-render-'));
  const inputs = JSON.parse(readFileSync(fixture, 'utf8'));
  inputs.exposeRatesToClient = true;
  const inputsPath = join(dir, 'inputs.json');
  writeFileSync(inputsPath, JSON.stringify(inputs));
  const json = join(dir, 'estimation.json');
  execFileSync('node', [computeCli, '--inputs', inputsPath, '--out', json]);
  execFileSync('node', [cli, '--json', json, '--md', passMd, '--out', dir, '--client-only']);
  const html = readFileSync(join(dir, 'estimate.html'), 'utf8');
  assert.match(html, /"rate":/);
});

test('the rendered page carries the roadmap section markup', () => {
  const html = renderedPage();
  assert.match(html, /id="roadmap"/);
  assert.match(html, /roadmapRow|roadmap-row/); // renderer present, not stripped
});
