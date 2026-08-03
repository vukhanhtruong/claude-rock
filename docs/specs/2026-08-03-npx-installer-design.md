# npx Installer (`agents-rock`) — Design

**Date:** 2026-08-03
**Status:** Approved

## Goal

Install this repo's plugin skills into any project via npx, for multiple agent
harnesses (Claude Code and Codex), without requiring the Claude Code plugin
marketplace:

```
npx agents-rock --plugin arch-docs --agent codex
```

The existing marketplace install path (`/plugin install arch-docs@claude-rock`)
stays untouched; npx is additive.

## Decisions

| Decision | Choice |
|---|---|
| Install scope | Project dir (cwd): `.agents/skills/` canonical + per-agent symlinks |
| Plugin source | Bundled inside the npm package (repo root publishes as `agents-rock`) |
| No-flag UX | Interactive picker (multi-select plugins, then agents) |
| npm package name | `agents-rock` (agent-neutral; repo stays `claude-rock`) |
| CLI scope v1 | Install + uninstall |
| Implementation | Zero-dependency Node CLI (`node:util` parseArgs, `node:readline` picker) |

## Package layout

Repo root becomes the npm package. No new repo, no workspace split.

```
claude-rock/  (npm name: agents-rock)
├── package.json          name=agents-rock, bin={agents-rock: bin/agents-rock.mjs},
│                         files=[bin, src, plugins], engines node>=18, no deps
├── bin/agents-rock.mjs   entry: shebang, parse args, dispatch
├── src/cli/
│   ├── args.mjs          parseArgs wrapper → {command, plugins[], agents[], force}
│   ├── registry.mjs      scan bundled plugins/*/.claude-plugin/plugin.json
│   ├── picker.mjs        readline arrow-key multi-select (flags missing)
│   ├── install.mjs       copy + symlink logic
│   └── uninstall.mjs     remove symlink + canonical copy
└── plugins/              existing layout, unchanged, ships inside package
```

- Plugin discovery reads bundled `plugins/*/.claude-plugin/plugin.json`
  (name, description, version) — no separate manifest.
- Each module stays under 200 lines; functions under 20 lines (quality gates).
- `npm publish` per release; plugin updates require version bump + publish.

## CLI interface

```
npx agents-rock                                      # interactive picker
npx agents-rock --plugin arch-docs --agent codex     # non-interactive
npx agents-rock -p a -p b -a claude -a codex         # repeatable, short aliases
npx agents-rock uninstall -p arch-docs -a codex
npx agents-rock --help | --version
```

- First positional arg = command; default `install`; only other command
  `uninstall`.
- `--plugin`/`-p` and `--agent`/`-a` repeatable. Valid agents: `claude`,
  `codex`.
- Short aliases: `-p` plugin, `-a` agent, `-f` force, `-h` help, `-v` version.
- Partial flags: missing dimension prompted interactively
  (e.g. `-p arch-docs` alone → picker asks only for agents). Applies to both
  commands; the picker always lists bundled plugins (uninstall does not scan
  the target project for installed skills in v1).
- `uninstall` with no `--agent` → removes for all agents.
- `--force`: replace existing files at destination (install); delete
  non-symlink collisions (uninstall).
- Unknown plugin/agent → error listing valid values, exit 1.
- Picker: arrow keys move, space toggles, enter confirms; plugin rows show
  name + description from plugin.json.

## Install mechanics

Per selected plugin, per skill dir under `plugins/<plugin>/skills/`:

```
cwd/
├── .agents/skills/<skill>/     ← recursive copy from bundle (canonical)
├── .claude/skills/<skill>  →  ../../.agents/skills/<skill>   (agent=claude)
└── .codex/skills/<skill>   →  ../../.agents/skills/<skill>   (agent=codex)
```

1. Copy skill dir from the bundle into `.agents/skills/<skill>`.
   Already exists → skip + warn; `--force` → replace.
2. Per agent: `mkdir -p` the agent skills dir, create a **relative** symlink.
   Already-correct symlink → idempotent no-op. Real file/dir in the way →
   error for that item; `--force` → replace.
3. Windows: symlink EPERM → fall back to junction; junction fails → plain
   copy + warn that updates won't propagate.
4. Print summary: what installed where, per agent.

Agent skill locations are project-level conventions of each harness:
Claude Code reads `.claude/skills/`, Codex reads `.codex/skills/`
(both discover `SKILL.md` per directory).

## Uninstall mechanics

1. Remove the agent symlink(s) for each selected skill.
2. When no agent dir still references the skill, remove the canonical
   `.agents/skills/<skill>`.
3. Non-symlink at the agent path → left alone unless `--force`.

## Error handling

All errors exit 1 with message on stderr.

| Case | Behavior |
|---|---|
| Unknown plugin/agent | Error + list valid values |
| Not writable | Plain fs error surfaced |
| Collision without `--force` | Warn, skip that item, continue others; exit 1 if anything skipped |
| Missing flags in non-TTY (CI) | Error "flags required in non-interactive mode" |

## Testing

`node:test`, zero-dep, TDD (RED-GREEN-VALIDATE):

- **Unit:** args parsing (aliases, repeatable flags, unknown values),
  registry scan, install/uninstall against tmp dirs (symlink correctness,
  idempotency, `--force` paths, uninstall refcount).
- **Integration:** spawn `bin/agents-rock.mjs` with flags in a tmp cwd,
  assert resulting tree + exit codes.
- **Picker:** pure state logic (cursor, toggle) extracted and unit tested;
  TTY rendering not tested.

## Out of scope (v1)

- Global (`~/.claude`, `~/.codex`) installs
- `list` command
- Fetching plugins from GitHub at runtime
- Agents beyond claude/codex
- npm publish CI automation
