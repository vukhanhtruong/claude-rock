# agents-rock

A Claude Code plugin marketplace.

## Install

```
/plugin marketplace add git@github.com:vukhanhtruong/agents-rock.git
```

(HTTPS equivalent: `https://github.com/vukhanhtruong/agents-rock.git`)

```
/plugin install <plugin>@agents-rock
```

Replace `<plugin>` with any plugin from the table below, e.g.
`/plugin install lmk@agents-rock`.

### Install via npx (Claude Code + Codex)

```
npx @v11g/agents-rock                                # interactive picker
npx @v11g/agents-rock -p <plugin> -a claude          # one plugin for Claude Code
npx @v11g/agents-rock -p <plugin> -a codex           # same plugin for Codex
npx @v11g/agents-rock -p <plugin> -a claude -a codex # both agents
npx @v11g/agents-rock uninstall -p <plugin>          # remove for all agents
```

`-p <plugin>` installs all skills that plugin ships.

Skills are copied to `.agents/skills/<skill>` in your project and symlinked
from `.claude/skills/` (Claude Code) and/or `.codex/skills/` (Codex).
Use `--force` to overwrite collisions.

## Plugins

| Plugin               | Description                                                                                                                                                                                | Version |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| `solution-architect` | Solution-architecture toolkit: interview-driven architecture documentation with interactive diagrams and provenance-tagged facts, AI-aware project estimation, and client-ready proposals. | 1.0.0   |
| `lmk`                | Terminal-native visual explainer: explains the current topic with cheap diagrams (flowcharts, sequences, timelines, tables) rendered directly in the terminal via a bundled Mermaid renderer. | 0.1.0   |

## Skills

Skills split on one axis — who invokes them. **User-invoked** skills are
reachable when you type them (e.g. `/new-lead`); their job is to run a flow
you asked for. **Model-invoked** skills can be invoked by you _or_ reached
for automatically by the agent when the task fits.

**User-invoked**

- **[new-lead](./plugins/solution-architect/skills/new-lead/SKILL.md)** (`solution-architect`) — Orchestrator: sets up a lead workspace and launches analyze-requirements → estimate → proposal in order, stopping between each, plus a leads dashboard.
- **[lmk](./plugins/lmk/skills/lmk/SKILL.md)** (`lmk`) — `/lmk` explains the current topic visually in the terminal; bare `/lmk` recaps the last substantial thing. Also auto-triggers on keywords like "explain this", "show me", or "I'm lost".

**Model-invoked**

- **[analyze-requirements](./plugins/solution-architect/skills/analyze-requirements/SKILL.md)** (`solution-architect`) — Interview-driven architecture documentation with interactive diagrams and provenance-tagged facts; triggers on asks for architecture docs, C4 diagrams, ADRs, or a threat model.
- **[estimate](./plugins/solution-architect/skills/estimate/SKILL.md)** (`solution-architect`) — Interview-driven, AI-aware project estimation with an interactive what-if page; triggers on asks for an estimate, quote, timeline, or "how long would this take".
- **[proposal](./plugins/solution-architect/skills/proposal/SKILL.md)** (`solution-architect`) — Pre-sales client proposal rendered as a print-ready page; triggers on asks for a proposal, client pitch, or "something I can send the client".

## Repo conventions

Each plugin follows the same layout:

```
plugins/<plugin>/
├── .claude-plugin/plugin.json
└── skills/<skill>/
    ├── SKILL.md         orchestration: entry point loaded by Claude Code
    ├── README.md        user-facing docs
    ├── assets/          static files the skill ships (templates, themes)
    ├── references/      supporting docs the skill points agents to
    ├── scripts/         zero-dep scripts the skill invokes
    └── workflows/       Workflow scripts the skill invokes
```

## Bundling a plugin

```
./bundle.sh <plugin>
```

Zips `plugins/<plugin>/` into `build/<plugin>.zip` (excluding `node_modules/`, `.git/`, and other zips).
