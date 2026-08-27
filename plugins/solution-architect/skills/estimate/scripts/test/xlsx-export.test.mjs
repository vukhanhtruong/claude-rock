// The Feature breakdown's spreadsheet export: an internal-only button that
// clones the sample estimator workbook in the browser, fills tab 1 with the
// currently visible rows, and keeps every tier/price formula live in-cell.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findChrome } from '../../../analyze-requirements/scripts/lib/chrome.mjs';
import { openPage } from '../../../analyze-requirements/scripts/lib/cdp.mjs';
import { readZip } from './zip.mjs';

const skip = { skip: !findChrome() && 'no chrome on PATH' };
const fixture = new URL('./fixtures/booking-inputs.json', import.meta.url).pathname;

function buildPage() {
  const dir = mkdtempSync(join(tmpdir(), 'estimate-xlsx-'));
  const scripts = new URL('..', import.meta.url).pathname;
  const passMd = join(scripts, 'test/fixtures/estimation-pass.md');
  execFileSync('node', [join(scripts, 'compute.mjs'), '--inputs', fixture, '--out', join(dir, 'estimation.json')]);
  execFileSync('node', [join(scripts, 'render.mjs'), '--json', join(dir, 'estimation.json'), '--md', passMd, '--out', dir]);
  return pathToFileURL(join(dir, 'estimate.html')).href;
}

async function exportedFiles(page) {
  const b64 = await page.eval('window.__buildWorkbook()');
  return readZip(Buffer.from(b64, 'base64'));
}

const sheet1 = (files) => files.get('xl/worksheets/sheet1.xml').toString('utf8');
const cell = (xml, ref) => new RegExp(`<c r="${ref}"[^>]*>(.*?)</c>`, 's').exec(xml)?.[1] ?? '';
const inlineText = (frag) => /<t[^>]*>([^<]*)<\/t>/.exec(frag)?.[1];
const cellNumber = (frag) => Number(/<v>([^<]*)<\/v>/.exec(frag)?.[1]);
const cellFormula = (frag) => /<f>([^<]*)<\/f>/.exec(frag)?.[1];

test('the breakdown filter bar carries an internal-only download button', skip, async () => {
  const page = await openPage(buildPage());
  try {
    assert.ok(await page.eval(
      `!!document.querySelector('#feature-table .bd-filters button[data-download][data-internal]')`),
    'expected a data-download button marked data-internal in the filter bar');
  } finally { page.close(); }
});

test('the export clones the sample workbook with its guide tabs intact', skip, async () => {
  const page = await openPage(buildPage());
  try {
    const files = await exportedFiles(page);
    for (const name of ['xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml',
      'xl/worksheets/sheet3.xml', 'xl/styles.xml', '[Content_Types].xml']) {
      assert.ok(files.has(name), `${name} missing from the exported archive`);
    }
    const workbook = files.get('xl/workbook.xml').toString('utf8');
    assert.match(workbook, /Scoring Guide/);
    assert.match(workbook, /Tier Reference/);
  } finally { page.close(); }
});

test('rows land as inline strings ordered by milestone with derived 1-5 scores', skip, async () => {
  const page = await openPage(buildPage());
  try {
    const xml = sheet1(await exportedFiles(page));
    // M1 feature before M2 feature regardless of the table's hour sort
    assert.equal(inlineText(cell(xml, 'A7')), 'User can book appointment');
    assert.equal(inlineText(cell(xml, 'A8')), 'Email reminders');
    for (const row of [7, 8]) {
      for (const col of ['B', 'C', 'D', 'E', 'F']) {
        const v = cellNumber(cell(xml, `${col}${row}`));
        assert.ok(Number.isInteger(v) && v >= 1 && v <= 5, `${col}${row} must be 1-5, got ${v}`);
      }
    }
  } finally { page.close(); }
});

test('score math stays in the sheet: G-K are formulas, total row uses SUMIF', skip, async () => {
  const page = await openPage(buildPage());
  try {
    const xml = sheet1(await exportedFiles(page));
    assert.match(cellFormula(cell(xml, 'G7')) ?? '', /SUM\(B7:F7\)/);
    assert.match(cellFormula(cell(xml, 'H7')) ?? '', /IF\(/);
    for (const ref of ['I7', 'J7', 'K7']) {
      assert.ok(cellFormula(cell(xml, ref)), `${ref} must hold a formula, not a baked value`);
    }
    assert.equal(inlineText(cell(xml, 'A27')), 'PROJECT TOTAL');
    assert.match(cellFormula(cell(xml, 'G27')) ?? '', /SUMIF\(G7:G26/);
  } finally { page.close(); }
});

test('milestone and container fill L/M under an autofiltered header', skip, async () => {
  const page = await openPage(buildPage());
  try {
    const xml = sheet1(await exportedFiles(page));
    assert.equal(inlineText(cell(xml, 'L6')), 'MILESTONE');
    assert.equal(inlineText(cell(xml, 'M6')), 'CONTAINER');
    assert.equal(inlineText(cell(xml, 'L7')), 'M1 - Booking core');
    assert.equal(inlineText(cell(xml, 'M7')), 'Booking API');
    assert.equal(inlineText(cell(xml, 'M8')), 'Notification Service');
    assert.match(xml, /<autoFilter ref="A6:M26"\/>/);
  } finally { page.close(); }
});

test('the export honours the active source filter', skip, async () => {
  const page = await openPage(buildPage());
  try {
    await page.eval(`document.querySelector('#feature-table [data-prov="stated"]').click()`);
    const xml = sheet1(await exportedFiles(page));
    assert.match(xml, /User can book appointment/);
    assert.doesNotMatch(xml, /Email reminders/);
    assert.equal(inlineText(cell(xml, 'A27')), 'PROJECT TOTAL', 'total row must survive filtering');
  } finally { page.close(); }
});
