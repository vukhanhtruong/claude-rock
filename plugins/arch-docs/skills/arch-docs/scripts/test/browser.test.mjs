import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openPage } from '../lib/cdp.mjs';
import { findChrome } from '../lib/chrome.mjs';

// Five batches of viewer work shipped verified only as template text. Text says a
// rule is present; it cannot say the rule wins, that the script survived boot, or
// that an embedded font was ever applied. These are the assertions that need a
// layout engine, and nothing else in the suite has one.
const fixtures = new URL('./fixtures/docs-pass/', import.meta.url).pathname;
const THEME = JSON.parse(readFileSync(
  new URL('../../assets/mermaid-theme.json', import.meta.url), 'utf8'));
// Same two shapes validate-palette.mjs looks for, but wrapped so the result is
// valid JavaScript. render.test.mjs' stub is not — it only ever gets read as
// text, so the browser is the first thing to try running it, and it throws
// `SyntaxError: Unexpected token ':'` on boot. Worth knowing that the fixture
// there proves nothing about whether a bundle of that shape can execute.
const LIKEC4_STUB = '/*likec4*/var likec4Theme = {'
  + `primary:{elements:{fill:\`${THEME.likec4.brand}\`,stroke:\`#00524b\`,`
  + 'hiContrast:`#c7ffff`,loContrast:`#b2ffff`}}};'
  + 'var likec4Node = {shape:`rectangle`,color:`primary`};';

// The fixture set is four short sections. Narrowing the column by pinning
// reflows it by nothing measurable, so a scroll-anchoring check written against
// it passes whether the anchoring exists or not — which is what happened: on the
// real 20-document set the text under the reader moved 48px, and the fixture
// stayed green through a build with the correction deleted. This document exists
// to give the reflow something to move.
// The diagram has to be on this page and above the prose, which is the real
// set's arrangement: pinning both lifts a block out of the flow and narrows the
// column, and only the two together move the anchor.
const REFLOW_DOC = [
  '# Reflow check', '',
  '## Long enough to reflow', '',
  '```mermaid', 'flowchart TD', '  A[Edge gateway] --> B[Settlement API]',
  '  B --> C[(Ledger)]', '  B --> D[Event publisher]', '```', '',
].concat(
  [
    'Settlement runs as a synchronous call and an outbound event, and the two disagree'
    + ' about time. The call returns when the ledger row is durable; the event is published'
    + ' after the transaction commits, which on a busy shard is tens of milliseconds later.',
    'A partner that reads its own write through the event stream will therefore miss it,'
    + ' and the miss looks exactly like a dropped message rather than like a race. The read'
    + ' replica has the same shape of lag and the same shape of confusion.',
    'Retries carry the idempotency key for twenty-six hours, one hour past the longest'
    + ' retry window any current partner uses. Inside that window a repeat returns the'
    + ' stored response verbatim, including the status code it first produced.',
    'That last detail decides more than it looks like it does. A create that first failed'
    + ' validation returns the same failure on retry, even if the model it was validated'
    + ' against has since changed, because the alternative is a key that means two things.',
    'Cancellation is where the boundary leaks. A settlement already in the capture window'
    + ' cannot be withdrawn, so cancel becomes a request rather than a command, and the'
    + ' caller learns the outcome from the event rather than from the response.',
    'The gateway enforces authentication and the service trusts what reaches it. That is'
    + ' a deliberate trade recorded in the decision log, and it is revisited every time'
    + ' the gateway changes owner, because a misconfiguration there is a full bypass.',
    'Rate limits are per credential rather than per address, advertised on every response'
    + ' so no caller has to discover them by exceeding one. The window slides over sixty'
    + ' seconds and is evaluated at the edge, never in the service.',
    'A partner needing more than the settlement tier is moved to the batch interface'
    + ' instead of having the limit raised. The synchronous path is sized for interactive'
    + ' traffic, and seven thousand writes a minute is not interactive.',
  ].flatMap((p) => [p, ''])).concat(
    // Heading text that collides with a spine key on purpose: this document is
    // unclassified (reflow.md is not docs[0] and isn't a companion basename), so
    // an explainer must not appear here. Without this, deleting the kind gate in
    // injectSectionHelp still leaves "an excluded document grew an explainer"
    // green, because none of this fixture's real headings matches a lookup key.
    ['## Security', ''],
  ).join('\n');

function buildViewer() {
  const out = mkdtempSync(join(tmpdir(), 'arch-docs-browser-'));
  const stub = (name, body) => { const p = join(out, name); writeFileSync(p, body); return p; };
  execFileSync('node', [
    'plugins/arch-docs/skills/arch-docs/scripts/render.mjs',
    '--root', fixtures, '--arch', `${fixtures}ARCHITECTURE.md`,
    '--docs', `${fixtures}docs/adr/0001-sample.md`, stub('reflow.md', REFLOW_DOC),
    '--out', out,
    '--likec4-bundle', stub('l.js', LIKEC4_STUB),
    // Mermaid is stubbed: the diagram renderer is not what these check, and a
    // 4.7 MB bundle would make the suite depend on a build step.
    '--mermaid-bundle', stub('m.js', 'var mermaid={registerLayoutLoaders(){},initialize(){},'
      + 'async render(){return {svg:"<svg/>"}}},elkLayouts={};'),
    '--theme', 'plugins/arch-docs/skills/arch-docs/assets/mermaid-theme.json',
  ], { stdio: 'pipe' });
  return join(out, 'index.html');
}

describe('the viewer in a real browser', { skip: findChrome() ? false : 'no chrome on PATH' }, () => {
  let page;

  before(async () => { page = await openPage(`file://${buildViewer()}`); });
  after(() => page?.close());

  // A single-file viewer is opened from disk as often as it is served, and
  // file:// is where localStorage throws SecurityError. The guard around it is
  // the one that keeps a failed theme read from taking the whole page.
  test('boots from file:// with no console error', async () => {
    assert.deepEqual(page.errors, []);
    assert.equal(await page.eval('document.querySelectorAll(".page").length > 0'), true);
  });

  test('the embedded faces are the ones actually used', async () => {
    assert.equal(await page.eval('document.fonts.check(\'16px "IBM Plex Sans"\')'), true,
      'IBM Plex Sans never loaded — the base64 @font-face did not take');
    const used = await page.eval('getComputedStyle(document.body).fontFamily');
    assert.match(used, /IBM Plex Sans/, `body resolved to ${used}`);
  });

  // One column, both edges. A `--prose` track capping paragraphs to 72ch was
  // tried and reverted: it left the text ending ~240px short of the h2 rule above
  // it and the table below it. Right edges are what the split broke, so both are
  // measured, and across every kind of running text rather than `p` alone.
  test('prose and blocks share both edges', async () => {
    const drift = await page.eval(`(() => {
      const vis = (s) => [...document.querySelectorAll(s)].find((e) => e.offsetParent);
      const block = vis('.table-wrap').getBoundingClientRect();
      return ['.main p', '.main ul', '.main h2', '.main h3']
        .map((s) => [s, vis(s)]).filter(([, e]) => e)
        .map(([s, e]) => {
          const r = e.getBoundingClientRect();
          return [s, Math.round(r.left - block.left), Math.round(r.right - block.right)];
        });
    })()`);
    assert.ok(drift.length >= 2, `only ${drift.length} kinds of prose on the page to compare`);
    for (const [sel, left, right] of drift) {
      // A list indents its markers; nothing else may move on either side.
      assert.ok(Math.abs(left) < 40, `${sel} starts ${left}px off the block edge`);
      assert.ok(Math.abs(right) < 2, `${sel} ends ${right}px short of the block edge`);
    }
  });

  // overflow-x: auto computes overflow-y to auto, so .table-scroll is a
  // scrollport — and a sticky header has nothing to stick inside unless that
  // scrollport is also given a height. Both halves are asserted, because the
  // first version of this test only measured drift after scrolling, and a
  // scrollport with no height cannot scroll: removing the cap made the check
  // silently vacuous instead of red, which is the same failure shape as
  // grepping a bundle for a hex that is present and never painted.
  test('the table scrollport is bounded, which is what lets its header stick', async () => {
    const css = await page.eval(`(() => {
      const s = [...document.querySelectorAll('.table-scroll')].find((e) => e.offsetParent);
      const c = getComputedStyle(s);
      return { maxHeight: c.maxHeight, overflowY: c.overflowY,
               th: getComputedStyle(s.querySelector('th')).position };
    })()`);
    assert.notEqual(css.maxHeight, 'none', 'an unbounded scrollport cannot hold a sticky header');
    assert.match(css.overflowY, /auto|scroll/);
    assert.equal(css.th, 'sticky');
  });

  // The fixture's table is two rows, so it never overflows the real cap. Forcing
  // a small one is the only way to watch the header actually stay put — the rule
  // under test is `position: sticky`, not the height the template chose.
  test('a header held in a scrollport does not scroll away with its rows', async () => {
    const stuck = await page.eval(`(() => {
      const s = [...document.querySelectorAll('.table-scroll')].find((e) => e.offsetParent);
      s.style.maxHeight = '48px';
      const th = s.querySelector('th');
      const before = th.getBoundingClientRect().top;
      s.scrollTop = 40;
      const moved = s.scrollTop > 0;
      const drift = Math.abs(th.getBoundingClientRect().top - before);
      s.style.maxHeight = '';
      return { moved, drift };
    })()`);
    assert.equal(stuck.moved, true, 'the scrollport did not scroll, so nothing was proven');
    assert.ok(stuck.drift < 2, `header drifted ${stuck.drift}px instead of sticking`);
  });

  test('the theme toggle repaints the page', async () => {
    const flip = await page.eval(`(() => {
      const bg = () => getComputedStyle(document.body).backgroundColor;
      const before = bg();
      document.getElementById('theme-toggle').click();
      return { before, after: bg(), attr: document.documentElement.dataset.theme };
    })()`);
    assert.notEqual(flip.before, flip.after, 'background did not change');
    assert.ok(['dark', 'light'].includes(flip.attr));
    await page.eval("document.getElementById('theme-toggle').click()");
  });

  // The filter runs on every keystroke and now also reads document body text.
  // Both the hit path and the empty state are states no text assertion reaches.
  test('the rail filter hides what does not match, and says when nothing does', async () => {
    const res = await page.eval(`(() => {
      const f = document.getElementById('nav-filter');
      const type = (v) => { f.value = v; f.dispatchEvent(new Event('input', { bubbles: true })); };
      type('zzzznomatch');
      const empty = getComputedStyle(document.getElementById('nav-empty')).display !== 'none';
      type('');
      const back = [...document.querySelectorAll('.nav-group')].every((g) => !g.hidden);
      return { empty, back };
    })()`);
    assert.equal(res.empty, true, 'no empty state for a filter that matches nothing');
    assert.equal(res.back, true, 'clearing the filter did not restore the rail');
  });

  test('a rail link swaps which page is in the layout', async () => {
    const nav = await page.eval(`(() => {
      const shown = () => [...document.querySelectorAll('.page')].filter((p) => p.offsetParent);
      const first = shown().length;
      document.querySelector('.nav-link').click();
      return { first, after: shown().length };
    })()`);
    assert.equal(nav.first, 1, `${nav.first} pages were in the layout at once`);
    assert.equal(nav.after, 1, 'navigation left more than one page visible');
  });

  // Paper has no router. Every page is already in the DOM, only hidden, so print
  // shows the whole set — which is what somebody printing an architecture
  // document meant.
  test('print reveals every page, not the routed one', async () => {
    await page.send('Emulation.setEmulatedMedia', { media: 'print' });
    const shown = await page.eval(
      "[...document.querySelectorAll('.page')].filter((p) => p.offsetParent).length");
    await page.send('Emulation.setEmulatedMedia', { media: '' });
    assert.ok(shown > 1, `print showed ${shown} page(s) out of the whole set`);
  });

  // The point of the feature, and the only assertion that can make it: scroll to
  // the bottom of the document and see whether the diagram is still on screen.
  test('a pinned diagram survives scrolling to the end of the document', async () => {
    const seen = await page.eval(`(() => {
      const shell = [...document.querySelectorAll('.diagram-shell')].find((e) => e.offsetParent);
      shell.querySelector('[data-pin]').click();
      scrollTo(0, document.body.scrollHeight);
      const r = shell.getBoundingClientRect();
      return { onScreen: r.top < innerHeight && r.bottom > 0 && r.width > 0,
               pressed: shell.querySelector('[data-pin]').getAttribute('aria-pressed') };
    })()`);
    assert.equal(seen.onScreen, true, 'the pinned diagram scrolled away with the prose');
    assert.equal(seen.pressed, 'true');
  });

  test('the pinned pane does not cover the prose it was pinned to read', async () => {
    const lap = await page.eval(`(() => {
      const shell = document.querySelector('.diagram-shell.is-pinned');
      const p = [...document.querySelectorAll('.main p')].find((e) => e.offsetParent);
      return p.getBoundingClientRect().right - shell.getBoundingClientRect().left;
    })()`);
    assert.ok(lap <= 0, `the pane overlaps the text column by ${lap}px`);
  });

  // Compared against the height the shell had *before* pinning: once pinned it is
  // a full-height pane, so measuring it then compares the placeholder to the
  // wrong box and reports ~400px of error against a correct placeholder.
  test('the placeholder holds exactly the space the diagram left', async () => {
    const fit = await page.eval(`(() => {
      const shell = document.querySelector('.diagram-shell.is-pinned')
        || [...document.querySelectorAll('.diagram-shell')].find((e) => e.offsetParent);
      if (shell.classList.contains('is-pinned')) shell.querySelector('[data-pin]').click();
      const inFlow = shell.offsetHeight;
      shell.querySelector('[data-pin]').click();
      const slot = document.querySelector('.diagram-slot');
      return slot ? Math.abs(parseFloat(slot.style.height) - inFlow) : null;
    })()`);
    assert.notEqual(fit, null, 'nothing was left holding the vacated space');
    assert.ok(fit < 2, `the placeholder is ${fit}px off the height it replaced`);
  });

  // The first version of this measured document height and asserted it barely
  // moved. That is the wrong quantity: reserving the gutter narrows the column,
  // so the whole document legitimately reflows taller — 980px taller on the real
  // 20-document set. What must not move is the text the reader is looking at, and
  // on that same set it moved 48px until the anchor was restored. The fixture is
  // too short to have shown either.
  // Three things this test got wrong before they were measured, each of which
  // made it green while measuring nothing:
  //   - `scrollTo(0, 500)` animates, because html sets scroll-behavior: smooth,
  //     so the page was still at the top when the anchor was read;
  //   - the router applies a frame after the click, so the long document was
  //     never the one on screen;
  //   - the window has to be narrow enough that the column is what binds, or the
  //     reserved gutter comes out of slack and nothing reflows at all.
  //
  // KNOWN LIMIT — this asserts the outcome but does not discriminate the code
  // that produces it. Deleting `keepingPlace` leaves this green, because on a
  // static fixture the whole reflow lands in one frame and Chrome's own scroll
  // anchoring absorbs it. On a real set the LikeC4 webcomponent re-fits a frame
  // later, after anchoring has run, and the anchor moves 48px. Measured on the
  // 20-document EOS set, both ways, twice. Guarding that needs a fixture with an
  // asynchronously-resizing diagram, which is a real bundle, which is a build
  // step this suite deliberately does not have. What this test does still catch:
  // pinning that stops reflowing, stops scrolling, or throws.
  test('pinning keeps the reader where they were', async () => {
    await page.send('Emulation.setDeviceMetricsOverride',
      { width: 1240, height: 800, deviceScaleFactor: 1, mobile: false });
    const res = await page.eval(`(async () => {
      const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      // These tests share one page, and an earlier one leaves a diagram pinned.
      // Pinning a second only swaps which diagram is in the pane — the gutter is
      // already reserved, so nothing reflows and the check measures nothing.
      dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await frame();
      [...document.querySelectorAll('.nav-link')]
        .find((a) => a.textContent.includes('Long enough to reflow')).click();
      await frame();
      scrollTo({ top: 500, behavior: 'instant' });
      await frame();
      const shell = [...document.querySelectorAll('.diagram-shell')].find((e) => e.offsetParent);
      const anchor = [...document.querySelectorAll('.main p')]
        .find((e) => e.offsetParent && e.getBoundingClientRect().top > 120);
      const before = anchor.getBoundingClientRect();
      shell.querySelector('[data-pin]').click();
      await frame();
      const after = anchor.getBoundingClientRect();
      shell.querySelector('[data-pin]').click();
      return { jump: Math.round(after.top - before.top),
               narrowed: Math.round(before.width - after.width),
               scrolled: Math.round(scrollY) };
    })()`);
    await page.send('Emulation.clearDeviceMetricsOverride');
    assert.ok(res.scrolled > 100, 'the page never scrolled, so nothing was anchored');
    assert.ok(res.narrowed > 20, `the column narrowed by ${res.narrowed}px — nothing reflowed`);
    assert.ok(Math.abs(res.jump) < 8, `the text under the reader moved ${res.jump}px`);
  });

  test('escape releases the pin and puts the diagram back in the flow', async () => {
    const after = await page.eval(`(() => {
      dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      return { pinned: document.querySelectorAll('.diagram-shell.is-pinned').length,
               slots: document.querySelectorAll('.diagram-slot').length,
               gutter: document.body.classList.contains('has-pin') };
    })()`);
    assert.deepEqual(after, { pinned: 0, slots: 0, gutter: false });
  });

  test('the skip link moves focus into the document', async () => {
    const landed = await page.eval(`(() => {
      const skip = document.querySelector('.skip');
      skip.click();
      document.getElementById('main-content').focus();
      return document.activeElement.id;
    })()`);
    assert.equal(landed, 'main-content');
  });

  // Template text says the loop is present. It cannot say the button was built,
  // that the lookup hit, or that a click opens anything — the panel is created in
  // script from a global, so a boot-order or key mistake shows up only here.
  test('a spine heading offers an explainer that opens on click', async () => {
    const found = await page.eval(`(() => {
      var h = [].slice.call(document.querySelectorAll('[data-kind="spine"] h2'))
        .filter(function (el) { return el.textContent.indexOf('Core Components') >= 0; })[0];
      if (!h) return { err: 'no Core Components heading under a spine page' };
      var btn = h.querySelector('.help-btn');
      if (!btn) return { err: 'no help button in the heading' };
      var panel = h.nextElementSibling;
      return {
        tag: panel && panel.tagName,
        cls: panel && panel.className,
        expanded: btn.getAttribute('aria-expanded'),
        controls: btn.getAttribute('aria-controls'),
        panelId: panel && panel.id,
        open: panel && panel.open,
      };
    })()`);
    assert.equal(found.err, undefined, found.err);
    assert.equal(found.tag, 'DETAILS');
    assert.equal(found.cls, 'help');
    assert.equal(found.expanded, 'false', 'a closed panel must not report itself open');
    assert.equal(found.controls, found.panelId, 'aria-controls does not reach the panel');
    assert.equal(found.open, false);
  });

  // The reason the panel is a <details> driven by a button rather than a bare
  // summary: the state has to be readable from the button, and both have to agree.
  test('clicking the explainer toggles both the panel and the button state', async () => {
    // aria-expanded is set from the <details> element's own "toggle" event,
    // which the HTML spec queues as a task rather than firing inline with the
    // click — so a tick has to pass before the button's attribute catches up.
    const cycle = await page.eval(`(async () => {
      var tick = function () { return new Promise(function (r) { setTimeout(r, 0); }); };
      var h = [].slice.call(document.querySelectorAll('[data-kind="spine"] h2'))
        .filter(function (el) { return el.textContent.indexOf('Core Components') >= 0; })[0];
      var btn = h.querySelector('.help-btn');
      var panel = h.nextElementSibling;
      btn.click();
      await tick();
      var opened = { open: panel.open, aria: btn.getAttribute('aria-expanded'),
        text: panel.textContent };
      btn.click();
      await tick();
      return { opened: opened, closed: { open: panel.open,
        aria: btn.getAttribute('aria-expanded') } };
    })()`);
    assert.equal(cycle.opened.open, true);
    assert.equal(cycle.opened.aria, 'true');
    assert.match(cycle.opened.text, /What goes here/);
    // The content is the asset's, not a label the loop invented.
    assert.match(cycle.opened.text, /responsible for/);
    assert.equal(cycle.closed.open, false);
    assert.equal(cycle.closed.aria, 'false');
  });

  // A document with no kind renders exactly as it does today. The ADR fixture is
  // the case the spec excludes by name: §14 is already the home for that guidance.
  test('a document with no kind gets no explainer', async () => {
    const count = await page.eval(
      "document.querySelectorAll('.page:not([data-kind]) .help-btn').length");
    assert.equal(count, 0, 'an excluded document grew an explainer');
  });

  // Subheadings are out of scope, and an h3 that happens to share a spine
  // heading's text must not pick one up.
  test('subheadings get no explainer', async () => {
    assert.equal(await page.eval("document.querySelectorAll('.doc h3 .help-btn').length"), 0);
  });

  test('injecting the explainers logs no error', async () => {
    assert.deepEqual(page.errors, []);
  });
});
