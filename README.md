# claude-rock

A Claude Code plugin marketplace.

## Install

```
/plugin marketplace add git@github.com:vukhanhtruong/claude-rock.git
```

(HTTPS equivalent: `https://github.com/vukhanhtruong/claude-rock.git`)

```
/plugin install solution-architect@claude-rock
```

### Install via npx (Claude Code + Codex)

```
npx agents-rock                                      # interactive picker
npx agents-rock -p solution-architect -a codex      # install solution-architect for Codex
npx agents-rock -p solution-architect -a claude -a codex  # both agents
npx agents-rock uninstall -p solution-architect     # remove for all agents
```

Skills are copied to `.agents/skills/<skill>` in your project and symlinked
from `.claude/skills/` (Claude Code) and/or `.codex/skills/` (Codex).
Use `--force` to overwrite collisions.

## Plugins

| Plugin | Description | Version |
|---|---|---|
| `solution-architect` | Solution-architecture toolkit: interview-driven architecture documentation with interactive diagrams and provenance-tagged facts, plus AI-aware project estimation. | 1.0.0 |

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
