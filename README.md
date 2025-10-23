# Claude Skills Repository 🚀

## Overview

This repository contains **Claude Skills** designed to enhance the capabilities of Claude Code for software engineers.

**Current Skills:**

- [**Architecture Design**](/plugins/architecture-design/skills/README.md) - Creates comprehensive software architecture documentation

## Quick Start

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

## Contributing

### 🚀 **Adding New Skills**

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

### 📝 **Update Process**

1. Create skill directory following structure
2. Add SKILL.md with comprehensive workflow
3. Include README.md with usage examples
4. Update marketplace.json with metadata
5. Test skill functionality thoroughly

## License

MIT License - see the [LICENSE](./LICENSE.md) file for details.
