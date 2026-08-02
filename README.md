# claude-rock

A Claude Code plugin marketplace.

## Install

```
/plugin marketplace add git@github.com:vukhanhtruong/claude-rock.git
```

(HTTPS equivalent: `https://github.com/vukhanhtruong/claude-rock.git`)

```
/plugin install arch-docs@claude-rock
```

## Plugins

| Plugin | Description | Version |
|---|---|---|
| `arch-docs` | Interview + research driven architecture documentation with interactive diagrams, provenance-tagged facts, offline viewer, and cross-consistency validation. | 1.0.0 |

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
