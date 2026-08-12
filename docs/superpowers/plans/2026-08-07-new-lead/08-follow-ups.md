# /new-lead — deferred follow-ups

**Why this file lives here:** it sits beside the plan's milestone files
(`00`–`07`), so the next contributor executing the plan finds the deferred work
in the same directory as the work that shipped — not in a review artifact they
have no reason to open.

**Provenance.** Every item below was classified `follow-up` by the final
whole-branch review (`.superpowers/sdd/00-overview/final-review.md` @ `8b3c0fb`),
or is one of that review's Minor findings (M1–M21) that the single fix wave did
not address. Nothing here is re-derived; locations and problem statements come
from the review's triage table and Minor sections. Human ruling H6 is the reason
these were deferred, and this document is the condition on which they were.

**Nothing here blocks merge.** None of it loses data or executes attacker code.
The review's verdict was READY WITH FIXES; the six Important findings were fixed
in the one authorised wave and are *not* repeated here.

Line references are as of `8b3c0fb` plus the fix wave. Where the wave shifted a
line, the current number is given.

---

## A. Deferred items from the review's triage table

Numbers in the first column are the review's triage row numbers, so a reader can
go back to the source. 22 rows are listed; the review's own summary says 21,
which is an off-by-one in its arithmetic (56 rows = 3 must + 22 follow-up + 31
ship). Over-inclusion is the safe direction.

| # | Location | Problem |
| --- | --- | --- |
| 3 | `scripts/lib/registry.mjs:65-76` (`writeRegistry`) | If `rename` throws, `leads.json.tmp` is left behind. The `finally` still releases the lock so the next write succeeds — an orphan file, not a stuck registry. |
| 4 | `scripts/test/registry-io.test.mjs` | Never removes its `mkdtemp` roots, so every run leaks a `/tmp/leads-*` directory. A trivial `after()` fixes it; the test body was brief-mandated verbatim, so leaving it was the correct call at the time. |
| 7 | `scripts/validate.mjs` | The exit-2 (usage) branch is untested. ~3-line test. |
| 8 | `scripts/validate.mjs` | A missing file or malformed JSON produces a raw promise rejection instead of a clean CLI error. Ugly, not wrong. **Bundle with rows 19 and 36 as one "CLI error handling" issue.** |
| 11 | `scripts/test/enrich.test.mjs` | Never asserts `hasBrief`/`hasNotes` are `false` on the missing-directory path. `enrichLead` is 13 lines and that false path is the uncovered one. |
| 13 | `scripts/lib/map.mjs:166-173` (`activityFor`) | The `catch` is untested — mutation showed that returning `[]` unconditionally survives the suite, so neither the `git log` parse nor the catch is covered. Needs `execFile` mocking or a fixture without git. |
| 15 | `scripts/serve.mjs:83-87` (`apiUpdate`) | Any `writeRegistry` failure becomes a blanket 409 whose body enumerates *other* leads' validation findings, and it is the one place a filesystem path could reach the client. Pairs with the `client`/`title` validation added for I4. |
| 16 | `scripts/test/serve.test.mjs` | No dedicated dotfile test, and `serveStatic`'s containment branch is untested. Note `serve.mjs:118` is unreachable given `resolve()` semantics; `:122` is the load-bearing one (see M8). |
| 19 | `scripts/serve.mjs` (`startServer`) | Throws a raw `ENOENT` on a nonexistent `--root`. Same bundle as row 8. |
| 21 | `scripts/test/serve.test.mjs:88-96` | The directory-GET regression test presents as a 90-second hang rather than a failure, masking the symlink test after it. Add `{ timeout: 5000 }`. |
| 23 | `assets/dashboard/stats.mjs` (`sortLeads`) | The `created`, `closed` and `client` sort keys are untested. The disclosed `l.closed ?? ''` ranking is exactly the untested branch, and `index.html:531` now depends on the `created` comparator. |
| 25 | `assets/dashboard/index.html` (timeline `.t-bar`) | Fixed at `6rem`, so the bars encode no duration. Design debt; decorative today. |
| 29 | `assets/dashboard/index.html:101-108` | The brief says "stats strip pinned top", but only `<header>` is sticky and `.stats` scrolls away. Needs the owner's intent — loose wording or a real miss. |
| 31 | `scripts/lib/registry.mjs:61-63` (`readRegistry`) | Bare `JSON.parse`, no validate-on-read. **Explicitly deferred by the owner during the fix wave**: the write-boundary half was fixed (I4 — `client`/`title` now required), but validate-on-read needs a deliberate error surface, not a patch that turns a working dashboard into a hard failure on any legacy file. |
| 36 | `scripts/lead-upsert.mjs` | Malformed `--patch` JSON throws a raw stack trace. Same bundle as row 8. |
| 37 | `scripts/lead-upsert.mjs` | The usage / exit-2 path is untested. ~3-line test. |
| 40 | `assets/dashboard/stats.mjs`, `scripts/serve.mjs` | Both sit at exactly 10 functions — the global per-file ceiling. No headroom: the next helper in either forces a split. This already constrained the I1 fix, which had to be inlined into `apiNotes` rather than extracted. |
| 44 | `references/review-lenses.md` (`client-readability` lens) | Mixes proposal's frontmatter vocabulary with the answers file's `client.techLevel`; it should cite the mapping now stated at `proposal/SKILL.md:74-76`. **Bundle with M15 and M21 as one review-lenses accuracy pass.** |
| 46 | `SKILL.md:56` | "3-4 of: stack, integrations, hosting, compliance, per `research.md`" is loose rather than false — those are not `research.md`'s phases (Domain/Stack/Design) or its args. **Bundle with M17.** |
| 47 | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` | Under-describe the plugin. Not false, just incomplete. (The root `README.md` *was* correctly updated three → four skills.) |
| 49 | `detail.html:593`, `index.html:467, 477, 517` | `esc()` used in a `class` context — see **M4**. Fix all four spots together. |
| 50 | `detail.html:608` | The validity-banner branch is unreachable: `panelsFor` returns `facts = {client, tech, delivery}`, never `proposal`, so `facts?.proposal?.validityDays` is always `undefined`. Dead code that looks live. Same root cause family as I2 — `panelsFor` does not forward what the page reads. |
| 52 | `assets/vendor-build/entry.jsx:32` (`mountCanvas`) | Leaks a React root per won/lost click — `createRoot` is called unconditionally. Silent only because the vendored React is a production build. An `unmount()` or a cached root fixes it. |

---

## B. Minor findings (M1–M21) not fixed in this wave

None of M1–M21 was fixed in the fix wave. Where a Minor is also a triage row, the
row is cross-referenced.

| ID | Location | Problem |
| --- | --- | --- |
| M1 | `index.html:619-631, 633-646` | `render()` is unguarded on every *interaction* path. `load()` has its own try/catch (`:393-398`), but the six interaction handlers (`CLICK_ACTIONS` entries, the `search` input listener, the `sort-key` change listener) call `render()` bare — so a post-load render throw is invisible: no banner, stale DOM, dead-looking control. This was the delivery mechanism for I4's silent failure. Two-line fix. |
| M2 | `scripts/serve.mjs:120-128` | Hardlink residual on the static allowlist. H3 resolves symlinks; a hardlink has nothing to resolve, so `realpath` returns the path itself and the allowlist re-check passes. Narrow in practice (Linux `fs.protected_hardlinks` defaults to 1). **Accepted as ship** — recorded so nobody mistakes "symlinks closed" for "the filesystem cannot alias into the allowlist". |
| M3 | `scripts/serve.mjs:26-27, 40-49, 99-107` (pre-wave numbering) | No CSRF or Host/Origin check on the mutating routes. `readJsonBody` ignores content-type, so `POST /api/leads/:id` and `.../notes` are CORS-simple requests a malicious open page can fire; and an arbitrary `Host` header is accepted (`curl -H 'Host: evil.example.com' … /api/leads` → 200), so a DNS-rebinding page can read the whole registry. A `Host` allowlist plus rejecting a cross-origin `Origin` on POSTs is ~5 lines. **Needs an owner policy call** — see section D. |
| M4 | `index.html:467, 477, 517`, `detail.html:593` | `esc()` is the wrong tool in a `class` context: it escapes `& < > " '` but not spaces, and at `detail.html:593` it is assigned to the `.className` *property*, where HTML escaping is a no-op that corrupts tokens. Reproduced: a lead with `status: "active pwn-class"` renders an injected class token. CSS-only, not exploitable. Whitelist against `STATUSES` instead. (= triage row 49.) |
| M5 | `scripts/lib/map.mjs:146-154` (`layout`) | Completely untested — making `layout()` a no-op (every node at `{x:0,y:0}`) survives the whole suite, so the diagram could render as one pile. Assert column order (`evidence 0 < interview 240 < arch 480 < …`) and that same-column nodes get distinct `y`. |
| M6 | `scripts/lib/map.mjs:157, 160-164`, `00-overview.md:95-96` | `map.mjs` can emit non-strings into a `string[]` contract: `openQuestionsFor` maps `s.name ?? s.item` and puts `undefined` in the array when neither key exists (`detail.html:725` then renders the literal word "undefined"); `risksFor`'s `String(r)` on an object gives `"[object Object]"`. Related: the module hedges on key names (`r.title`, `s.label`, `s.item`) that the M02 T1 carry-forward established do not exist. |
| M7 | `scripts/serve.mjs:25`, `scripts/lib/map.mjs:13-19` | An unknown lead id returns a synthetic 200 map, not a 404: every `readJson`/`readText` returns `null` and `buildLeadMap` builds the pending-node skeleton anyway. Cosmetic (the detail page handles it), but the API tells the client a nonexistent lead exists. |
| M8 | `serve.test.mjs:97-104`, `init-root.test.mjs:28`, `init-root.test.mjs:9` | Three test assertions weaker than their names claim. **Partly closed by the wave:** the third (`init-root.test.mjs`'s stale local `ASSET_FILES` copy that omitted `stats.mjs`) is fixed — the test now imports `ASSET_FILES`/`SCRIPT_FILES` from the module. Still open: (a) `serve.test.mjs:97-104` "symlink pointing outside root is rejected, not followed" asserts only the status code, with no `doesNotMatch` body check, so deleting the guard it protects leaves the suite green; (b) `init-root.test.mjs:28` "…keeps registry" never looks at the registry, so the data-loss path in its own name is uncovered. Six further mutations also survived (`apiNotes`' two guards, `apiUpdate`'s `body.closed` passthrough, `activityFor`, `chmod 0o755` on `start.sh`). |
| M9 | `scripts/test/serve.test.mjs:10-24` | One server and one mutated fixture shared across 20+ tests: `:36` marks `acme-crm` won, `:51` writes its `notes.md`, `:97-146` leave six symlinks behind, and `:26`'s `artifacts` assertions depend on running before `:36`'s mutation. **Accepted as ship** — Node runs a file's tests sequentially, so it is deterministic today. Flagged so a future reorder or concurrency change is read as a real risk, not a flake. The wave's two new symlink-write tests clean up after themselves. |
| M10 | `references/answers-schema.md:42` | The `scope` row's "Read by" omits proposal, although `proposal/SKILL.md:78-80` and `references/interview.md:78-86` both state proposal reads `scope.summary` — that routing *is* what fix commit `1de86d9` landed. `interview.md:8` declares the schema file authoritative, so the two disagree about the very routing the fix was for. Same bookkeeping failure as I2. |
| M11 | `references/interview.md:201-203` | False about standalone behaviour: it says arch-docs' `projectType` is "never asked, combined **or standalone**", but `arch-docs/references/interview.md:31` asks exactly that (scope "both", skipped only on high detector confidence) and `arch-docs/SKILL.md:21` says to state the detection and let the user override. The orchestrated half is right; the "or standalone" clause is false. One-clause fix. |
| M12 | `SKILL.md:88-89` | The quoted proposal render command drops the path prefix its source carries: `--md proposal.md --estimation estimation.json --out <leadDir>/dist` versus `proposal/SKILL.md:42-43`'s `--md <dir>/proposal.md --estimation <dir>/estimation.json`. Internally inconsistent about the working directory. (The parallel claim about the *estimate* render at `SKILL.md:68-69` is **not** a defect — `estimate/SKILL.md:42` itself uses bare filenames, so new-lead quotes it faithfully.) |
| M13 | `SKILL.md:36` | "run `node scripts/init-root.mjs --root <dir>` **at cwd**" contradicts the plugin's script-path convention, under which all four skills resolve `scripts/<x>.mjs` relative to the *skill* directory. Read literally it puts the agent where the script does not exist. Reword so it is clear `--root` is the cwd *target*. |
| M14 | `SKILL.md:118-120` | Promises detail the workflow contract cannot carry: the failure table specifies `done`/`failed` "with the exact `validate.mjs` finding", but no workflow return shape carries finding text — `REPORT`, `FINDINGS` and `FIXED` (`references/workflows.md:24-38`) expose only `validateExit: number`. |
| M15 | `references/review-lenses.md:82, 86` | Cites bare `references/ai-multipliers.md` and `references/slicing.md`, which are *estimate's* references. `new-lead/references/` contains neither, and this file is handed to reviewer agents by absolute path, so those two resolve nowhere. Every other lens in the file qualifies its paths. Bundle with triage row 44 and M21. |
| M16 | `references/interview.md:176` | Undercounts proposal's interview §2 as "both bullets" when `proposal/references/interview.md:37-40` has **three**. The third ("Anything in ARCHITECTURE.md or estimation.md that conflicts or is unclear → ask, never guess") is neither covered by Batch 2 nor listed under "Rows with no combined coverage". Since the table exists to decide what *not* to ask, an uncounted bullet is a dropped question. |
| M17 | `SKILL.md:56`, `references/workflows.md:57-67`, `arch-docs/references/research.md:35-37` | Possible duplicated research fan-out in the ARCH workflow: `research.md` §2 says "nothing else calls the research agents", yet the ARCH workflow spawns its own research agents told to follow `research.md`, and `arch-docs/SKILL.md:49-50` keeps step 4 Research "unchanged" in orchestrated mode — so the writer runs `workflows/research.js` a second time. Wasted tokens rather than a wrong result, but it needs a deliberate call. Bundle with triage row 46. |
| M18 | `detail.html:461-476` vs `index.html:12-13` | Theme choice does not survive navigation, and the index page has no control. `detail.html`'s three-button toggle writes only `document.documentElement.dataset.theme` with no persistence, and `index.html` ships no control at all. Choose dark on a detail page, go back to the index, get system theme. `index.html` already persists five pieces of UI state under `newlead.dashboard.*`, so the mechanism is there. (The token vocabularies themselves are fine — 36 of 38 CSS custom properties are shared by identical name.) |
| M19 | `assets/vendor-build/package.json:6-8` | No build script. The vendored bundle is a committed generated artifact whose recipe lives only in `04-lead-detail.md:85-88`; `package.json` still carries `npm init -y` boilerplate. Dependencies are pinned and `package-lock.json` is committed, so it *is* reproducible — but only if you find the plan document. Add the `esbuild … --global-name=LeadFlow …` line as `"build"`. |
| M20 | `README.md:18-21, 26-35, 38` | Overstates and under-describes: `:38` "Registry writes go through `scripts/lead-upsert.mjs` exclusively" is false as written (`serve.mjs:75-89` writes `status`/`closed` via `writeRegistry`, which `SKILL.md:104` relies on) — true only if scoped to *agent* writes; `:18-21` says "each workflow is unattended — research fan-out, a headless writer, …" but only ARCH has a Research phase; `:26-35`'s workspace tree omits `detail.html`, `stats.mjs`, `lib/` and `vendor/`, all of which `init-root.mjs:10-11` copies and `serve.mjs:9-11` requires. |
| M21 | `references/review-lenses.md:42-44` | Overstates a validator's precision: claims the check "name-diffs the Core Components, External Integrations, and Data Stores tables **against the model**", but Data Stores is diffed against ER-diagram entity names, not the model (`validate-model-tables.mjs:6`), and matching is case-insensitive rather than "exact". Bundle with triage row 44 and M15. |

---

## C. Tests the review named as the highest-leverage gaps

Neither was added in the fix wave; both are recorded here rather than lost.

| Gap | Why it matters |
| --- | --- |
| **Fixture conformance test** — validate every committed `new-lead-answers.json` fixture against `references/answers-schema.md` | Would close the whole I2 class. It cannot be added until the committed fixture is made schema-conformant: `scripts/test/fixtures/root/acme-crm/new-lead-answers.json:4` carries a non-schema `client.name` and `techLevel: "intermediate"`, a value in neither vocabulary. It is the branch's only example of a real answers file, so it is also the one input under which every browser verification of the Key-facts panel ran. See section E. |
| **`docs.test.mjs` for new-lead** | No test anywhere covers any new-lead document or any orchestrated-mode section, so none of the branch's ~200 prose claims has a regression net — unlike the sibling skills' docs, which `proposal/scripts/test/docs.test.mjs` pins. Four of the six Important findings were documentation defects. |

---

## D. Open questions that need an owner, not an engineer

These are from the review's "What I could not settle". They are listed because
several follow-ups above cannot be scoped until they are answered.

| Question | Blocks |
| --- | --- |
| Is a webpage open in the user's browser inside the threat model? | **M3.** The spec says bind 127.0.0.1 and it does, so this is policy, not a spec violation. I1's fix removed the arbitrary-file-**write** primitive that raised the stakes, but the drive-by POST surface remains. |
| Was the stats strip meant to be sticky? | **Triage row 29.** |
| Is Chrome-only acceptable for a local tool? | `detail.html` has only ever been verified in headless Chrome; Firefox, Safari and touch are unverified. |
| The live `/new-lead` run (M07 Task 2) | Every gate, workflow launch and `resumeFromRunId` path exists only as prose. Verification to date covers the *scripts and pages*, not the *orchestration*. Run it on a **fresh** leads root. |
| The Workflow tool contract | `phase()`, `agent()`, `parallel()`, `meta.phases`, `Workflow({scriptPath, resumeFromRunId})` are a design spec with no implementation in the repo. Consistent with `arch-docs/workflows/research.js`, which is encouraging, not proof. |
| `AskUserQuestion`'s per-call limit vs interview batch sizes | `interview.md:13-14` specifies 4-6 questions per batch and Batch 1 lists six, while `arch-docs/references/interview.md:39` assumes max 3 cards per call. |

---

## E. Raised during the fix wave, not in the review

| Location | Problem |
| --- | --- |
| `scripts/lib/registry.mjs:70-71` (`writeRegistry`) | The same symlink class as I1, on the registry write path, and **not fixed** because the wave was scoped to I1's route. `writeFile(join(root, 'leads.json.tmp'), …)` follows a symlink at `leads.json.tmp`, so pre-planting one is an arbitrary-file write of registry JSON; the subsequent `rename` then moves the symlink itself, leaving `leads.json` as the symlink. Narrower than I1 (needs write access to the leads root itself, not just a lead dir) and never reproduced end to end — recorded as a lead, not a confirmed defect. The same `lstat`-before-write shape used in `apiNotes` would close it. |
| `scripts/serve.mjs:53-57, 118, 122, 83` | The containment idiom `x !== root && !x.startsWith(root + sep)` is now written four times in one file (`serveFile`, `serveStatic` ×2, `apiNotes`). A `containedIn(root, p)` one-liner would dedupe it, but the file is at the 10-function ceiling (row 40), so the helper cannot be added without a split. Any future change to containment semantics currently needs four synchronised edits. |
| `scripts/test/fixtures/root/acme-crm/new-lead-answers.json:4` | Non-schema `client.name` and out-of-vocabulary `techLevel: "intermediate"`. **Deliberately left alone** — the fixture is a shared cross-task asset and the wave was told not to change it silently. Nothing reads either field any more: the I2 fix moved the detail page's Client row onto registry `lead.client`, and a repo-wide search for `client.name` after the wave returns zero hits. Blast radius of making it conformant is therefore expected to be nil, but it was not attempted and not verified, and it is the prerequisite for the conformance test in section C. |
