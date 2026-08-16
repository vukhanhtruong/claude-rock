# npx Installer (`agents-rock`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A zero-dependency npx CLI (`agents-rock`) that installs/uninstalls this repo's plugin skills into a target project for Claude Code and Codex.

**Architecture:** The repo root publishes as npm package `agents-rock` with `plugins/` bundled inside. The CLI copies skill dirs to `<cwd>/.agents/skills/<skill>` (canonical) and creates relative symlinks from `.claude/skills/` (claude) and `.codex/skills/` (codex). Interactive readline picker fills in missing flags. Spec: `docs/specs/2026-08-03-npx-installer-design.md`.

**Tech Stack:** Node >= 18, ESM (`.mjs`), `node:util` parseArgs, `node:readline`, `node:test`. Zero runtime dependencies.

## Global Constraints

- Node >= 18; no runtime dependencies; ESM `.mjs` files only.
- npm package name: `agents-rock`. Bin name: `agents-rock`.
- Valid agents: `claude`, `codex`. Agent dirs: `.claude`, `.codex`. Canonical dir: `.agents/skills/`.
- Symlinks are **relative** (e.g. `../../.agents/skills/arch-docs`).
- Quality gates: max 200 lines/file, 20 lines/function, 3 positional params/function (options objects allowed), 2 nesting levels, 10 functions/file.
- TDD: every behavior gets a failing test first (`node --test`).
- Commit messages: Conventional Commits, no AI attribution trailers.
- All error output to stderr; errors exit 1.

## File Structure

```
package.json              (Task 1) npm manifest, bin, files
bin/agents-rock.mjs       (Task 7) thin entry: shebang + main()
src/cli/args.mjs          (Task 2) arg parsing + UsageError
src/cli/registry.mjs      (Task 3) bundled plugin/skill discovery
src/cli/agents.mjs        (Task 4) agent dir constants + path helpers
src/cli/install.mjs       (Task 4) copy canonical + create symlinks
src/cli/uninstall.mjs     (Task 5) remove symlinks + refcounted canonical
src/cli/picker.mjs        (Task 6) interactive multi-select (pure state + TTY glue)
src/cli/main.mjs          (Task 7) orchestration, help/version, summary
tests/args.test.mjs       (Task 2)
tests/registry.test.mjs   (Task 3)
tests/install.test.mjs    (Task 4)
tests/uninstall.test.mjs  (Task 5)
tests/picker.test.mjs     (Task 6)
tests/cli.test.mjs        (Task 7) integration: spawn the bin
README.md                 (Task 8) npx usage section
```

---

### Task 1: Package scaffolding

**Files:**

- Create: `package.json`

**Interfaces:**

- Produces: npm package `agents-rock` whose tarball contains `plugins/`; `npm test` runs `node --test tests/`.

- [ ] **Step 1: Create package.json**

```json
{
  "name": "agents-rock",
  "version": "0.1.0",
  "description": "Install claude-rock plugin skills for Claude Code and Codex via npx",
  "type": "module",
  "bin": { "agents-rock": "bin/agents-rock.mjs" },
  "files": ["bin", "src", "plugins"],
  "engines": { "node": ">=18" },
  "scripts": { "test": "node --test tests/" },
  "repository": {
    "type": "git",
    "url": "https://github.com/v11g/agents-rock.git"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Verify tarball contents**

Run: `npm pack --dry-run 2>&1 | grep -c "plugins/arch-docs"`
Expected: count > 0 (plugin files included). Also confirm no `docs/`, `build/`, `.claude/` entries in the listing.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: add agents-rock npm package manifest"
```

---

### Task 2: Argument parsing (`args.mjs`)

**Files:**

- Create: `src/cli/args.mjs`
- Test: `tests/args.test.mjs`

**Interfaces:**

- Produces:
  - `parseCliArgs(argv: string[]) → { command: 'install'|'uninstall', plugins: string[], agents: string[], force: boolean, help: boolean, version: boolean }` — throws `UsageError` on unknown command/flag/agent or extra positionals.
  - `class UsageError extends Error`
  - `const VALID_AGENTS = ['claude', 'codex']`

- [ ] **Step 1: Write failing tests**

```js
// tests/args.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCliArgs, UsageError } from "../src/cli/args.mjs";

test("defaults to install with empty selections", () => {
  assert.deepEqual(parseCliArgs([]), {
    command: "install",
    plugins: [],
    agents: [],
    force: false,
    help: false,
    version: false,
  });
});

test("parses long flags, repeatable", () => {
  const r = parseCliArgs([
    "--plugin",
    "a",
    "--plugin",
    "b",
    "--agent",
    "codex",
    "--force",
  ]);
  assert.deepEqual(r.plugins, ["a", "b"]);
  assert.deepEqual(r.agents, ["codex"]);
  assert.equal(r.force, true);
});

test("parses short aliases", () => {
  const r = parseCliArgs(["-p", "arch-docs", "-a", "claude", "-f"]);
  assert.deepEqual(r.plugins, ["arch-docs"]);
  assert.deepEqual(r.agents, ["claude"]);
  assert.equal(r.force, true);
});

test("parses uninstall command", () => {
  assert.equal(parseCliArgs(["uninstall"]).command, "uninstall");
});

test("rejects unknown command", () => {
  assert.throws(() => parseCliArgs(["destroy"]), UsageError);
});

test("rejects extra positionals", () => {
  assert.throws(() => parseCliArgs(["install", "extra"]), UsageError);
});

test("rejects unknown flag", () => {
  assert.throws(() => parseCliArgs(["--bogus"]), UsageError);
});

test("rejects unknown agent with valid list in message", () => {
  assert.throws(() => parseCliArgs(["-a", "gemini"]), /claude, codex/);
});

test("parses help and version", () => {
  assert.equal(parseCliArgs(["-h"]).help, true);
  assert.equal(parseCliArgs(["-v"]).version, true);
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `node --test tests/args.test.mjs`
Expected: FAIL — `Cannot find module '../src/cli/args.mjs'`

- [ ] **Step 3: Implement `src/cli/args.mjs`**

```js
import { parseArgs } from "node:util";

export class UsageError extends Error {}

export const VALID_AGENTS = ["claude", "codex"];
const COMMANDS = new Set(["install", "uninstall"]);

const OPTIONS = {
  plugin: { type: "string", multiple: true, short: "p" },
  agent: { type: "string", multiple: true, short: "a" },
  force: { type: "boolean", short: "f" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
};

export function parseCliArgs(argv) {
  const { values, positionals } = tryParse(argv);
  const command = positionals[0] ?? "install";
  if (!COMMANDS.has(command))
    throw new UsageError(`Unknown command: ${command}`);
  if (positionals.length > 1)
    throw new UsageError(`Unexpected argument: ${positionals[1]}`);
  validateAgents(values.agent ?? []);
  return {
    command,
    plugins: values.plugin ?? [],
    agents: values.agent ?? [],
    force: values.force ?? false,
    help: values.help ?? false,
    version: values.version ?? false,
  };
}

function tryParse(argv) {
  try {
    return parseArgs({ args: argv, options: OPTIONS, allowPositionals: true });
  } catch (err) {
    throw new UsageError(err.message);
  }
}

function validateAgents(agents) {
  for (const agent of agents) {
    if (!VALID_AGENTS.includes(agent)) {
      throw new UsageError(
        `Unknown agent: ${agent}. Valid agents: ${VALID_AGENTS.join(", ")}`,
      );
    }
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `node --test tests/args.test.mjs`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/args.mjs tests/args.test.mjs
git commit -m "feat: parse agents-rock CLI arguments"
```

---

### Task 3: Plugin registry (`registry.mjs`)

**Files:**

- Create: `src/cli/registry.mjs`
- Test: `tests/registry.test.mjs`

**Interfaces:**

- Produces:
  - `loadRegistry(pluginsDir: string) → Array<{name, description, version, dir}>` — scans `<pluginsDir>/*/.claude-plugin/plugin.json`, sorted by name; missing dir → `[]`; dirs without manifest skipped.
  - `listSkills(pluginDir: string) → Array<{name, dir}>` — subdirs of `<pluginDir>/skills/`; missing → `[]`.

- [ ] **Step 1: Write failing tests**

Tests build a fixture tree in a tmp dir — they must not depend on real repo plugins.

```js
// tests/registry.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadRegistry, listSkills } from "../src/cli/registry.mjs";

function makeFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "agents-rock-"));
  const plugins = path.join(root, "plugins");
  const mk = (name, meta) => {
    const dir = path.join(plugins, name);
    mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
    writeFileSync(
      path.join(dir, ".claude-plugin", "plugin.json"),
      JSON.stringify(meta),
    );
    mkdirSync(path.join(dir, "skills", name, "assets"), { recursive: true });
    writeFileSync(path.join(dir, "skills", name, "SKILL.md"), `# ${name}`);
    return dir;
  };
  mk("beta-plugin", {
    name: "beta-plugin",
    description: "B",
    version: "2.0.0",
  });
  mk("alpha-plugin", {
    name: "alpha-plugin",
    description: "A",
    version: "1.0.0",
  });
  mkdirSync(path.join(plugins, "not-a-plugin"));
  return { root, plugins };
}

test("loadRegistry returns plugins sorted by name, skipping non-plugins", (t) => {
  const { root, plugins } = makeFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const reg = loadRegistry(plugins);
  assert.deepEqual(
    reg.map((p) => p.name),
    ["alpha-plugin", "beta-plugin"],
  );
  assert.equal(reg[0].description, "A");
  assert.equal(reg[0].version, "1.0.0");
  assert.ok(reg[0].dir.endsWith(path.join("plugins", "alpha-plugin")));
});

test("loadRegistry returns [] for missing dir", () => {
  assert.deepEqual(loadRegistry("/nonexistent/nowhere"), []);
});

test("listSkills lists skill dirs", (t) => {
  const { root, plugins } = makeFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const skills = listSkills(path.join(plugins, "alpha-plugin"));
  assert.deepEqual(
    skills.map((s) => s.name),
    ["alpha-plugin"],
  );
});

test("listSkills returns [] when no skills dir", (t) => {
  const { root, plugins } = makeFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.deepEqual(listSkills(path.join(plugins, "not-a-plugin")), []);
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `node --test tests/registry.test.mjs`
Expected: FAIL — `Cannot find module '../src/cli/registry.mjs'`

- [ ] **Step 3: Implement `src/cli/registry.mjs`**

```js
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export function loadRegistry(pluginsDir) {
  if (!existsSync(pluginsDir)) return [];
  return readdirSync(pluginsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readPlugin(path.join(pluginsDir, entry.name)))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function readPlugin(dir) {
  const manifest = path.join(dir, ".claude-plugin", "plugin.json");
  if (!existsSync(manifest)) return null;
  const meta = JSON.parse(readFileSync(manifest, "utf8"));
  return {
    name: meta.name,
    description: meta.description ?? "",
    version: meta.version ?? "",
    dir,
  };
}

export function listSkills(pluginDir) {
  const skillsDir = path.join(pluginDir, "skills");
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      dir: path.join(skillsDir, entry.name),
    }));
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `node --test tests/registry.test.mjs`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/registry.mjs tests/registry.test.mjs
git commit -m "feat: discover bundled plugins and skills"
```

---

### Task 4: Install (`agents.mjs` + `install.mjs`)

**Files:**

- Create: `src/cli/agents.mjs`
- Create: `src/cli/install.mjs`
- Test: `tests/install.test.mjs`

**Interfaces:**

- Consumes: `listSkills(pluginDir)` from Task 3.
- Produces:
  - `agents.mjs`: `AGENT_DIRS = { claude: '.claude', codex: '.codex' }`, `ALL_AGENTS = ['claude','codex']`, `agentSkillsDir(agent, cwd) → string` (`<cwd>/<agentDir>/skills`), `canonicalSkillsDir(cwd) → string` (`<cwd>/.agents/skills`).
  - `install.mjs`: `installPlugin({pluginDir, cwd, agents, force}) → { installed: [{skill, agent, mode: 'symlink'|'junction'|'copy'|'linked'}], skipped: [{skill, agent, path, reason}], reused: [{skill, path}] }`
- Semantics (from spec):
  - Canonical exists without `--force` → **reuse** (warn, not a failure); with `--force` → replace copy.
  - Agent path holds correct symlink → `mode: 'linked'` no-op (idempotent).
  - Agent path holds anything else → `skipped` unless `--force` (then replaced).
  - Symlink `EPERM`/`EACCES` → junction → plain copy (`mode` records which).

- [ ] **Step 1: Write failing tests**

```js
// tests/install.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  lstatSync,
  readlinkSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { installPlugin } from "../src/cli/install.mjs";
import { agentSkillsDir, canonicalSkillsDir } from "../src/cli/agents.mjs";

function makePlugin(root) {
  const dir = path.join(root, "bundle", "demo");
  mkdirSync(path.join(dir, "skills", "demo", "assets"), { recursive: true });
  writeFileSync(path.join(dir, "skills", "demo", "SKILL.md"), "# demo v1");
  writeFileSync(path.join(dir, "skills", "demo", "assets", "a.txt"), "asset");
  return dir;
}

function setup(t) {
  const root = mkdtempSync(path.join(tmpdir(), "agents-rock-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const cwd = path.join(root, "project");
  mkdirSync(cwd, { recursive: true });
  return { pluginDir: makePlugin(root), cwd };
}

test("installs canonical copy plus relative symlinks per agent", (t) => {
  const { pluginDir, cwd } = setup(t);
  const result = installPlugin({ pluginDir, cwd, agents: ["claude", "codex"] });
  const canonical = path.join(canonicalSkillsDir(cwd), "demo");
  assert.equal(
    readFileSync(path.join(canonical, "SKILL.md"), "utf8"),
    "# demo v1",
  );
  for (const agent of ["claude", "codex"]) {
    const link = path.join(agentSkillsDir(agent, cwd), "demo");
    assert.ok(lstatSync(link).isSymbolicLink());
    assert.equal(
      readlinkSync(link),
      path.join("..", "..", ".agents", "skills", "demo"),
    );
  }
  assert.equal(result.installed.length, 2);
  assert.equal(result.skipped.length, 0);
});

test("re-install is idempotent (mode linked, nothing skipped)", (t) => {
  const { pluginDir, cwd } = setup(t);
  installPlugin({ pluginDir, cwd, agents: ["claude"] });
  const result = installPlugin({ pluginDir, cwd, agents: ["claude"] });
  assert.deepEqual(
    result.installed.map((i) => i.mode),
    ["linked"],
  );
  assert.equal(result.reused.length, 1);
  assert.equal(result.skipped.length, 0);
});

test("adding a second agent reuses existing canonical", (t) => {
  const { pluginDir, cwd } = setup(t);
  installPlugin({ pluginDir, cwd, agents: ["claude"] });
  const result = installPlugin({ pluginDir, cwd, agents: ["codex"] });
  assert.equal(result.installed[0].agent, "codex");
  assert.equal(result.reused.length, 1);
});

test("real dir at agent path is skipped without force", (t) => {
  const { pluginDir, cwd } = setup(t);
  const blocker = path.join(agentSkillsDir("claude", cwd), "demo");
  mkdirSync(blocker, { recursive: true });
  const result = installPlugin({ pluginDir, cwd, agents: ["claude"] });
  assert.equal(result.skipped.length, 1);
  assert.ok(!lstatSync(blocker).isSymbolicLink());
});

test("force replaces blocker and stale canonical", (t) => {
  const { pluginDir, cwd } = setup(t);
  const blocker = path.join(agentSkillsDir("claude", cwd), "demo");
  mkdirSync(blocker, { recursive: true });
  const canonical = path.join(canonicalSkillsDir(cwd), "demo");
  mkdirSync(canonical, { recursive: true });
  writeFileSync(path.join(canonical, "SKILL.md"), "stale");
  const result = installPlugin({
    pluginDir,
    cwd,
    agents: ["claude"],
    force: true,
  });
  assert.equal(result.skipped.length, 0);
  assert.equal(
    readFileSync(path.join(canonical, "SKILL.md"), "utf8"),
    "# demo v1",
  );
  assert.ok(lstatSync(blocker).isSymbolicLink());
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `node --test tests/install.test.mjs`
Expected: FAIL — `Cannot find module '../src/cli/install.mjs'`

- [ ] **Step 3: Implement `src/cli/agents.mjs`**

```js
import path from "node:path";

export const AGENT_DIRS = { claude: ".claude", codex: ".codex" };
export const ALL_AGENTS = Object.keys(AGENT_DIRS);

export function agentSkillsDir(agent, cwd) {
  return path.join(cwd, AGENT_DIRS[agent], "skills");
}

export function canonicalSkillsDir(cwd) {
  return path.join(cwd, ".agents", "skills");
}
```

- [ ] **Step 4: Implement `src/cli/install.mjs`**

```js
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import path from "node:path";
import { listSkills } from "./registry.mjs";
import { agentSkillsDir, canonicalSkillsDir } from "./agents.mjs";

export function installPlugin({ pluginDir, cwd, agents, force = false }) {
  const result = { installed: [], skipped: [], reused: [] };
  for (const skill of listSkills(pluginDir)) {
    const canonical = copyCanonical({ skill, cwd, force, result });
    for (const agent of agents) {
      linkAgent({ skill: skill.name, canonical, agent, cwd, force, result });
    }
  }
  return result;
}

function copyCanonical({ skill, cwd, force, result }) {
  const dest = path.join(canonicalSkillsDir(cwd), skill.name);
  if (existsSync(dest) && !force) {
    result.reused.push({ skill: skill.name, path: dest });
    return dest;
  }
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(skill.dir, dest, { recursive: true });
  return dest;
}

function linkAgent({ skill, canonical, agent, cwd, force, result }) {
  const linkPath = path.join(agentSkillsDir(agent, cwd), skill);
  const status = inspectLink(linkPath, canonical);
  if (status === "correct")
    return result.installed.push({ skill, agent, mode: "linked" });
  if (status === "occupied" && !force) {
    return result.skipped.push({
      skill,
      agent,
      path: linkPath,
      reason: "exists (use --force)",
    });
  }
  if (status !== "missing") rmSync(linkPath, { recursive: true, force: true });
  mkdirSync(path.dirname(linkPath), { recursive: true });
  result.installed.push({
    skill,
    agent,
    mode: createLink(canonical, linkPath),
  });
}

function inspectLink(linkPath, canonical) {
  let stat;
  try {
    stat = lstatSync(linkPath);
  } catch {
    return "missing";
  }
  if (!stat.isSymbolicLink()) return "occupied";
  const target = path.resolve(path.dirname(linkPath), readlinkSync(linkPath));
  return target === path.resolve(canonical) ? "correct" : "occupied";
}

function createLink(canonical, linkPath) {
  const relTarget = path.relative(path.dirname(linkPath), canonical);
  try {
    symlinkSync(relTarget, linkPath, "dir");
    return "symlink";
  } catch (err) {
    if (err.code !== "EPERM" && err.code !== "EACCES") throw err;
    return fallbackLink(canonical, linkPath);
  }
}

function fallbackLink(canonical, linkPath) {
  try {
    symlinkSync(path.resolve(canonical), linkPath, "junction");
    return "junction";
  } catch {
    cpSync(canonical, linkPath, { recursive: true });
    return "copy";
  }
}
```

(`fallbackLink` is untestable on Linux CI — it exists for Windows `EPERM`; leave uncovered.)

- [ ] **Step 5: Run tests, verify pass**

Run: `node --test tests/install.test.mjs`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/cli/agents.mjs src/cli/install.mjs tests/install.test.mjs
git commit -m "feat: install skills as canonical copy plus agent symlinks"
```

---

### Task 5: Uninstall (`uninstall.mjs`)

**Files:**

- Create: `src/cli/uninstall.mjs`
- Test: `tests/uninstall.test.mjs`

**Interfaces:**

- Consumes: `listSkills` (Task 3), `agentSkillsDir`, `canonicalSkillsDir`, `ALL_AGENTS` (Task 4), `installPlugin` (Task 4, test setup only).
- Produces: `uninstallPlugin({pluginDir, cwd, agents, force}) → { removed: [{skill, agent}], canonicalRemoved: string[], skipped: [{skill, agent, path, reason}] }`
- Semantics (from spec):
  - Removes agent symlink(s) for each skill of the plugin.
  - Canonical `.agents/skills/<skill>` removed only when no agent dir still references the skill (check all known agents, not just selected).
  - Non-symlink at agent path → skipped unless `--force`.
  - Missing entries are silent no-ops.

- [ ] **Step 1: Write failing tests**

```js
// tests/uninstall.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { installPlugin } from "../src/cli/install.mjs";
import { uninstallPlugin } from "../src/cli/uninstall.mjs";
import { agentSkillsDir, canonicalSkillsDir } from "../src/cli/agents.mjs";

function makePlugin(root) {
  const dir = path.join(root, "bundle", "demo");
  mkdirSync(path.join(dir, "skills", "demo"), { recursive: true });
  writeFileSync(path.join(dir, "skills", "demo", "SKILL.md"), "# demo");
  return dir;
}

function setup(t) {
  const root = mkdtempSync(path.join(tmpdir(), "agents-rock-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const cwd = path.join(root, "project");
  mkdirSync(cwd, { recursive: true });
  return { pluginDir: makePlugin(root), cwd };
}

test("uninstalling last agent removes canonical too", (t) => {
  const { pluginDir, cwd } = setup(t);
  installPlugin({ pluginDir, cwd, agents: ["claude"] });
  const result = uninstallPlugin({ pluginDir, cwd, agents: ["claude"] });
  assert.deepEqual(result.removed, [{ skill: "demo", agent: "claude" }]);
  assert.deepEqual(result.canonicalRemoved, ["demo"]);
  assert.ok(!existsSync(path.join(agentSkillsDir("claude", cwd), "demo")));
  assert.ok(!existsSync(path.join(canonicalSkillsDir(cwd), "demo")));
});

test("canonical kept while another agent still references skill", (t) => {
  const { pluginDir, cwd } = setup(t);
  installPlugin({ pluginDir, cwd, agents: ["claude", "codex"] });
  const result = uninstallPlugin({ pluginDir, cwd, agents: ["codex"] });
  assert.deepEqual(result.canonicalRemoved, []);
  assert.ok(existsSync(path.join(canonicalSkillsDir(cwd), "demo")));
  assert.ok(existsSync(path.join(agentSkillsDir("claude", cwd), "demo")));
});

test("non-symlink at agent path skipped without force", (t) => {
  const { pluginDir, cwd } = setup(t);
  const realDir = path.join(agentSkillsDir("claude", cwd), "demo");
  mkdirSync(realDir, { recursive: true });
  const result = uninstallPlugin({ pluginDir, cwd, agents: ["claude"] });
  assert.equal(result.skipped.length, 1);
  assert.ok(existsSync(realDir));
});

test("non-symlink removed with force", (t) => {
  const { pluginDir, cwd } = setup(t);
  const realDir = path.join(agentSkillsDir("claude", cwd), "demo");
  mkdirSync(realDir, { recursive: true });
  const result = uninstallPlugin({
    pluginDir,
    cwd,
    agents: ["claude"],
    force: true,
  });
  assert.equal(result.skipped.length, 0);
  assert.ok(!existsSync(realDir));
});

test("uninstalling when nothing installed is a silent no-op", (t) => {
  const { pluginDir, cwd } = setup(t);
  const result = uninstallPlugin({
    pluginDir,
    cwd,
    agents: ["claude", "codex"],
  });
  assert.deepEqual(result, { removed: [], canonicalRemoved: [], skipped: [] });
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `node --test tests/uninstall.test.mjs`
Expected: FAIL — `Cannot find module '../src/cli/uninstall.mjs'`

- [ ] **Step 3: Implement `src/cli/uninstall.mjs`**

```js
import { existsSync, lstatSync, rmSync } from "node:fs";
import path from "node:path";
import { listSkills } from "./registry.mjs";
import { agentSkillsDir, canonicalSkillsDir, ALL_AGENTS } from "./agents.mjs";

export function uninstallPlugin({ pluginDir, cwd, agents, force = false }) {
  const result = { removed: [], canonicalRemoved: [], skipped: [] };
  for (const skill of listSkills(pluginDir)) {
    for (const agent of agents) {
      removeAgentEntry({ skill: skill.name, agent, cwd, force, result });
    }
    maybeRemoveCanonical(skill.name, cwd, result);
  }
  return result;
}

function removeAgentEntry({ skill, agent, cwd, force, result }) {
  const linkPath = path.join(agentSkillsDir(agent, cwd), skill);
  let stat;
  try {
    stat = lstatSync(linkPath);
  } catch {
    return;
  }
  if (!stat.isSymbolicLink() && !force) {
    return result.skipped.push({
      skill,
      agent,
      path: linkPath,
      reason: "not a symlink (use --force)",
    });
  }
  rmSync(linkPath, { recursive: true, force: true });
  result.removed.push({ skill, agent });
}

function maybeRemoveCanonical(skill, cwd, result) {
  const stillReferenced = ALL_AGENTS.some((agent) => {
    try {
      return Boolean(lstatSync(path.join(agentSkillsDir(agent, cwd), skill)));
    } catch {
      return false;
    }
  });
  if (stillReferenced) return;
  const canonical = path.join(canonicalSkillsDir(cwd), skill);
  if (!existsSync(canonical)) return;
  rmSync(canonical, { recursive: true, force: true });
  result.canonicalRemoved.push(skill);
}
```

(`lstatSync` in the refcount, not `existsSync`: a skipped non-symlink dir must still count as a reference, and `existsSync` would miss it if it were a dangling symlink.)

- [ ] **Step 4: Run tests, verify pass**

Run: `node --test tests/uninstall.test.mjs`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/uninstall.mjs tests/uninstall.test.mjs
git commit -m "feat: uninstall skills with refcounted canonical removal"
```

---

### Task 6: Interactive picker (`picker.mjs`)

**Files:**

- Create: `src/cli/picker.mjs`
- Test: `tests/picker.test.mjs`

**Interfaces:**

- Produces:
  - `createPickerState(items: Array<{value, label, hint?}>) → {items, cursor: number, selected: Set}`
  - `reduceKey(state, key: 'up'|'down'|'space'|'') → state` (pure)
  - `renderPicker(state, title: string) → string` (pure)
  - `runPicker({title, items}) → Promise<string[]|null>` — TTY interaction; enter resolves selected values, ctrl-c resolves `null`. Caller guarantees TTY.

- [ ] **Step 1: Write failing tests (pure functions only)**

```js
// tests/picker.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createPickerState,
  reduceKey,
  renderPicker,
} from "../src/cli/picker.mjs";

const ITEMS = [
  { value: "a", label: "alpha", hint: "first" },
  { value: "b", label: "beta" },
];

test("cursor moves down and clamps at both ends", () => {
  let s = createPickerState(ITEMS);
  s = reduceKey(s, "up");
  assert.equal(s.cursor, 0);
  s = reduceKey(s, "down");
  assert.equal(s.cursor, 1);
  s = reduceKey(s, "down");
  assert.equal(s.cursor, 1);
});

test("space toggles selection at cursor", () => {
  let s = createPickerState(ITEMS);
  s = reduceKey(s, "space");
  assert.deepEqual([...s.selected], ["a"]);
  s = reduceKey(s, "space");
  assert.deepEqual([...s.selected], []);
});

test("unknown key leaves state unchanged", () => {
  const s = createPickerState(ITEMS);
  assert.equal(reduceKey(s, ""), s);
});

test("render shows cursor, checkboxes, hints", () => {
  let s = createPickerState(ITEMS);
  s = reduceKey(s, "space");
  const out = renderPicker(s, "Pick plugins");
  assert.match(out, /Pick plugins/);
  assert.match(out, /> \[x\] alpha {2}first/);
  assert.match(out, / {2}\[ \] beta/);
  assert.match(out, /space: toggle/);
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `node --test tests/picker.test.mjs`
Expected: FAIL — `Cannot find module '../src/cli/picker.mjs'`

- [ ] **Step 3: Implement `src/cli/picker.mjs`**

```js
import readline from "node:readline";

export function createPickerState(items) {
  return { items, cursor: 0, selected: new Set() };
}

export function reduceKey(state, key) {
  if (key === "up") return { ...state, cursor: Math.max(0, state.cursor - 1) };
  if (key === "down") {
    return {
      ...state,
      cursor: Math.min(state.items.length - 1, state.cursor + 1),
    };
  }
  if (key === "space") return toggle(state);
  return state;
}

function toggle(state) {
  const selected = new Set(state.selected);
  const value = state.items[state.cursor].value;
  if (selected.has(value)) selected.delete(value);
  else selected.add(value);
  return { ...state, selected };
}

export function renderPicker(state, title) {
  const rows = state.items.map((item, i) => {
    const cursor = i === state.cursor ? ">" : " ";
    const mark = state.selected.has(item.value) ? "[x]" : "[ ]";
    const hint = item.hint ? `  ${item.hint}` : "";
    return `${cursor} ${mark} ${item.label}${hint}`;
  });
  return [
    title,
    ...rows,
    "(space: toggle, enter: confirm, ctrl-c: cancel)",
  ].join("\n");
}

export function runPicker({ title, items }) {
  return new Promise((resolve) => {
    const session = { state: createPickerState(items), title, rendered: 0 };
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const onKey = makeKeyHandler(session, (value) => {
      teardown(onKey);
      resolve(value);
    });
    process.stdin.on("keypress", onKey);
    draw(session);
  });
}

function makeKeyHandler(session, finish) {
  return (str, key) => {
    if (key.ctrl && key.name === "c") return finish(null);
    if (key.name === "return") return finish([...session.state.selected]);
    session.state = reduceKey(session.state, keyName(key));
    draw(session);
  };
}

function keyName(key) {
  if (key.name === "up" || key.name === "down" || key.name === "space")
    return key.name;
  return "";
}

function draw(session) {
  if (session.rendered > 0)
    process.stdout.write(`\x1b[${session.rendered}A\x1b[J`);
  const text = renderPicker(session.state, session.title);
  session.rendered = text.split("\n").length;
  process.stdout.write(text + "\n");
}

function teardown(onKey) {
  process.stdin.setRawMode(false);
  process.stdin.pause();
  process.stdin.removeListener("keypress", onKey);
}
```

(`runPicker` and its TTY helpers stay untested — pure logic is covered above.)

- [ ] **Step 4: Run tests, verify pass**

Run: `node --test tests/picker.test.mjs`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/picker.mjs tests/picker.test.mjs
git commit -m "feat: add readline multi-select picker"
```

---

### Task 7: Orchestration + bin (`main.mjs`, `bin/agents-rock.mjs`)

**Files:**

- Create: `src/cli/main.mjs`
- Create: `bin/agents-rock.mjs`
- Test: `tests/cli.test.mjs`

**Interfaces:**

- Consumes: everything from Tasks 2-6.
- Produces: `main(argv: string[]) → Promise<number>` (exit code). Bin: `#!/usr/bin/env node`, sets `process.exitCode`.
- Behavior:
  - `--help`/`--version` print to stdout, exit 0. Version read from bundled `package.json`.
  - Plugins from flags validated against registry (`UsageError` lists valid names).
  - Missing plugins/agents + TTY → picker; missing + non-TTY → `UsageError` "Missing --plugin/--agent; interactive mode requires a TTY".
  - `uninstall` with no `--agent` → `ALL_AGENTS` (no picker).
  - Empty picker selection → "Nothing selected." error, exit 1.
  - Exit 1 if any item was `skipped`; otherwise 0.
  - Summary lines to stdout, e.g. `✔ arch-docs → codex (symlink)`, `↻ arch-docs (canonical exists, reused)`, `✖ skipped .claude/skills/arch-docs — exists (use --force)`.

- [ ] **Step 1: Write failing integration tests**

Tests spawn the real bin against the real bundled `arch-docs` plugin, in a tmp cwd. Non-TTY stdin comes free with `spawnSync` pipes.

```js
// tests/cli.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, lstatSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(new URL("../bin/agents-rock.mjs", import.meta.url));

function run(args, cwd) {
  return spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: "utf8" });
}

function tmpProject(t) {
  const dir = mkdtempSync(path.join(tmpdir(), "agents-rock-cli-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test("installs arch-docs for both agents via flags", (t) => {
  const cwd = tmpProject(t);
  const res = run(["-p", "arch-docs", "-a", "claude", "-a", "codex"], cwd);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(existsSync(path.join(cwd, ".agents/skills/arch-docs/SKILL.md")));
  assert.ok(
    lstatSync(path.join(cwd, ".claude/skills/arch-docs")).isSymbolicLink(),
  );
  assert.ok(
    lstatSync(path.join(cwd, ".codex/skills/arch-docs")).isSymbolicLink(),
  );
  assert.match(res.stdout, /arch-docs/);
});

test("uninstall for one agent keeps canonical, for all removes it", (t) => {
  const cwd = tmpProject(t);
  run(["-p", "arch-docs", "-a", "claude", "-a", "codex"], cwd);
  let res = run(["uninstall", "-p", "arch-docs", "-a", "codex"], cwd);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(!existsSync(path.join(cwd, ".codex/skills/arch-docs")));
  assert.ok(existsSync(path.join(cwd, ".agents/skills/arch-docs")));
  res = run(["uninstall", "-p", "arch-docs"], cwd);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(!existsSync(path.join(cwd, ".claude/skills/arch-docs")));
  assert.ok(!existsSync(path.join(cwd, ".agents/skills/arch-docs")));
});

test("unknown plugin errors with valid names listed", (t) => {
  const cwd = tmpProject(t);
  const res = run(["-p", "nope", "-a", "claude"], cwd);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /arch-docs/);
});

test("missing flags in non-TTY errors instead of hanging", (t) => {
  const cwd = tmpProject(t);
  const res = run([], cwd);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /TTY/);
});

test("collision without force exits 1 and reports skip", (t) => {
  const cwd = tmpProject(t);
  run(["-p", "arch-docs", "-a", "claude"], cwd);
  rmSync(path.join(cwd, ".claude/skills/arch-docs"));
  const mk = spawnSync("mkdir", [
    "-p",
    path.join(cwd, ".claude/skills/arch-docs"),
  ]);
  assert.equal(mk.status, 0);
  const res = run(["-p", "arch-docs", "-a", "claude"], cwd);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /force/);
});

test("--help and --version exit 0", (t) => {
  const cwd = tmpProject(t);
  assert.match(run(["--help"], cwd).stdout, /Usage: agents-rock/);
  assert.match(run(["--version"], cwd).stdout, /\d+\.\d+\.\d+/);
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `node --test tests/cli.test.mjs`
Expected: FAIL — bin does not exist (spawn error / status null)

- [ ] **Step 3: Implement `src/cli/main.mjs`**

```js
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCliArgs, UsageError, VALID_AGENTS } from "./args.mjs";
import { loadRegistry } from "./registry.mjs";
import { runPicker } from "./picker.mjs";
import { installPlugin } from "./install.mjs";
import { uninstallPlugin } from "./uninstall.mjs";
import { ALL_AGENTS } from "./agents.mjs";

const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));

export async function main(argv) {
  try {
    return await run(argv);
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    console.error(err.message);
    return 1;
  }
}

async function run(argv) {
  const args = parseCliArgs(argv);
  if (args.help) return printHelp();
  if (args.version) return printVersion();
  const registry = loadRegistry(path.join(PACKAGE_ROOT, "plugins"));
  const plugins = await resolvePlugins(args, registry);
  const agents = await resolveAgents(args);
  if (!plugins.length || !agents.length)
    throw new UsageError("Nothing selected.");
  return execute({ args, plugins, agents });
}

async function resolvePlugins(args, registry) {
  const names = registry.map((p) => p.name);
  for (const name of args.plugins) {
    if (!names.includes(name)) {
      throw new UsageError(
        `Unknown plugin: ${name}. Available: ${names.join(", ")}`,
      );
    }
  }
  if (args.plugins.length)
    return args.plugins.map((n) => registry.find((p) => p.name === n));
  requireInteractive();
  const picked = await runPicker({
    title: "Select plugins:",
    items: registry.map((p) => ({
      value: p.name,
      label: p.name,
      hint: p.description,
    })),
  });
  if (picked === null) throw new UsageError("Cancelled.");
  return picked.map((n) => registry.find((p) => p.name === n));
}

async function resolveAgents(args) {
  if (args.agents.length) return args.agents;
  if (args.command === "uninstall") return ALL_AGENTS;
  requireInteractive();
  const picked = await runPicker({
    title: "Select agents:",
    items: VALID_AGENTS.map((a) => ({ value: a, label: a })),
  });
  if (picked === null) throw new UsageError("Cancelled.");
  return picked;
}

function requireInteractive() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new UsageError(
      "Missing --plugin/--agent; interactive mode requires a TTY.",
    );
  }
}

function execute({ args, plugins, agents }) {
  let skippedTotal = 0;
  for (const plugin of plugins) {
    const opts = {
      pluginDir: plugin.dir,
      cwd: process.cwd(),
      agents,
      force: args.force,
    };
    const result =
      args.command === "install" ? installPlugin(opts) : uninstallPlugin(opts);
    skippedTotal += printSummary(plugin.name, result);
  }
  return skippedTotal > 0 ? 1 : 0;
}

function printSummary(pluginName, result) {
  for (const item of result.reused ?? []) {
    console.log(`↻ ${item.skill} (canonical exists, reused)`);
  }
  for (const item of result.installed ?? []) {
    console.log(
      `✔ ${pluginName}: ${item.skill} → ${item.agent} (${item.mode})`,
    );
  }
  for (const item of result.removed ?? []) {
    console.log(`✔ ${pluginName}: removed ${item.skill} ← ${item.agent}`);
  }
  for (const skill of result.canonicalRemoved ?? []) {
    console.log(`✔ ${pluginName}: removed canonical ${skill}`);
  }
  for (const item of result.skipped ?? []) {
    console.log(`✖ skipped ${item.path} — ${item.reason}`);
  }
  return (result.skipped ?? []).length;
}

function printHelp() {
  console.log(`Usage: agents-rock [install|uninstall] [options]

Install plugin skills for Claude Code and Codex into the current project.

Options:
  -p, --plugin <name>   Plugin to install/uninstall (repeatable)
  -a, --agent <name>    Target agent: claude, codex (repeatable)
  -f, --force           Overwrite/remove collisions
  -h, --help            Show help
  -v, --version         Show version`);
  return 0;
}

function printVersion() {
  const pkg = JSON.parse(
    readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8"),
  );
  console.log(pkg.version);
  return 0;
}
```

Note: `printSummary` handles both install and uninstall result shapes via `?? []` — absent keys iterate zero times. File is ~110 lines / 9 functions — within gates.

- [ ] **Step 4: Implement `bin/agents-rock.mjs`**

```js
#!/usr/bin/env node
import { main } from "../src/cli/main.mjs";

process.exitCode = await main(process.argv.slice(2));
```

Make it executable: `chmod +x bin/agents-rock.mjs`

- [ ] **Step 5: Run tests, verify pass**

Run: `node --test tests/cli.test.mjs`
Expected: all PASS

- [ ] **Step 6: Manual smoke test of picker (not automatable)**

Run in a scratch dir: `node <repo>/bin/agents-rock.mjs` — verify: plugin list renders with description, space toggles, enter proceeds to agent picker, install summary prints, ctrl-c cancels cleanly (terminal echo restored).

- [ ] **Step 7: Commit**

```bash
git add bin/agents-rock.mjs src/cli/main.mjs tests/cli.test.mjs
git commit -m "feat: wire agents-rock CLI entry with picker and summary"
```

---

### Task 8: Docs + final validation

**Files:**

- Modify: `README.md` (add npx section after the existing marketplace Install section)

**Interfaces:**

- Consumes: the finished CLI.

- [ ] **Step 1: Add README section**

Insert after the existing `## Install` block:

````markdown
### Install via npx (Claude Code + Codex)

```
npx agents-rock                                  # interactive picker
npx agents-rock -p arch-docs -a codex            # install arch-docs for Codex
npx agents-rock -p arch-docs -a claude -a codex  # both agents
npx agents-rock uninstall -p arch-docs           # remove for all agents
```

Skills are copied to `.agents/skills/<skill>` in your project and symlinked
from `.claude/skills/` (Claude Code) and/or `.codex/skills/` (Codex).
Use `--force` to overwrite collisions.
````

- [ ] **Step 2: Full test suite with coverage**

Run: `node --test --experimental-test-coverage tests/`
Expected: all PASS, line coverage >= 80% (TTY glue in `picker.mjs` and Windows fallback in `install.mjs` are the only expected gaps).

- [ ] **Step 3: Quality-gate check**

Run: `wc -l src/cli/*.mjs bin/agents-rock.mjs`
Expected: every file <= 200 lines. Spot-check no function exceeds 20 lines.

- [ ] **Step 4: Pack sanity**

Run: `npm pack --dry-run`
Expected: tarball lists `bin/`, `src/cli/`, `plugins/arch-docs/**`, `package.json`; no `docs/`, `build/`, `tests/`.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: document npx agents-rock install"
```

---

## Out of scope (per spec)

Global installs, `list` command, GitHub fetch at runtime, agents beyond claude/codex, npm publish CI automation. Actual `npm publish` of 0.1.0 happens manually after this plan lands (name availability on npm must be checked at that point).
