# Claude Rock 🚀

This repository contains **Claude Skills** designed to enhance the capabilities of Claude Code for software engineers.

## Skills:

### Architecture Design

| Skill                                                               | Description                                               | Download                                                                                              |
| ------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [architecture-design](plugins/architecture-design/skills/README.md) | Creates comprehensive software architecture documentation | [ZIP](https://github.com/vukhanhtruong/claude-rock/raw/refs/heads/main/build/architecture-design.zip) |

### DevOps

| Skill                                                           | Description                                                     | Download                                                                                               |
| --------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [helm-scaffold](/plugins/devops/skills/helm-scaffold/README.md) | Generates production-ready Helm charts following best practices | [ZIP](https://github.com/vukhanhtruong/claude-rock/raw/refs/heads/main/build/devops-helm-scaffold.zip) |

### Browser Devtools

| Skill                                                                        | Description                                             | Download                                                                                           |
| ---------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [browser-devtools](/plugins/browser-devtools/skills/helm-scaffold/README.md) | Browser debugging and automation skill using Playwright | [ZIP](https://github.com/vukhanhtruong/claude-rock/raw/refs/heads/main/build/browser-devtools.zip) |

# Quick Start

## Claude Code Installation

### 1. Add the Marketplace to Claude Code

```bash
/plugin marketplace add vukhanhtruong/claude-rock
```

### 2: Install Plugins

Browse available plugins:

```bash
/plugin
```

Install the plugins you need:

```bash
/plugin install architecture-design
```

To verify installation, ask Claude Code:

```bash
Show available skills?
```

**NOTE**: Make sure restart Claude Code after installing or enable/disable plugins.

## Claude Chat Installation

1. Download the skill ZIP file the [Skills table](#skills) above.
1. Go to [Settings > Capabilities](https://claude.ai/settings/capabilities)
1. Click "Upload Skill"
1. Select the file you downloaded
1. Toggle the switch to enable it
1. The skill is now ready to use

# Contributing

## 🚀 **Adding New Skills**

**Skill Structure:**

```
plugins/your-plugin/skills/
├── SKILL.md           # Skill implementation details
├── README.md          # User-facing documentation
├── assets/            # Templates and resources
├── references/        # Technology-specific info
└── scripts/           # Automation utilities
```

**Naming Conventions:**

- Use kebab-case for directory names
- SKILL.md should contain implementation details
- README.md should be user-facing documentation
- Include proper marketplace.json metadata

## 📝 **Update Process**

1. Create skill directory following structure
2. Add SKILL.md with comprehensive workflow
3. Include README.md with usage examples
4. Update marketplace.json with metadata
5. Test skill functionality thoroughly

# License

MIT License - see the [LICENSE](./LICENSE.md) file for details.
