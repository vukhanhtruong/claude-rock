# Claude Rock 🚀

## Overview

This repository contains **Claude Skills** designed to enhance the capabilities of Claude Code for software engineers.

**Current Skills:**

- [**Architecture Design**](/plugins/architecture-design/skills/README.md) - Creates comprehensive software architecture documentation

## Quick Start

### Claude Code Installation

#### 1. Add the Marketplace to Claude Code

```bash
/plugin marketplace add vukhanhtruong/claude-rock
```

#### 2: Install Plugins

Browse available plugins:

```bash
/plugin
```

Install the plugins you need:

```bash
/plugin install architecture-design

```

### Claude Chat Installation

### Step 1: Download the Skill

1. Go to this [page](https://github.com/vukhanhtruong/claude-rock/tree/main/build)
2. Download a skill and save it to your computer

### Step 2: Upload to Claude

1. Go to [Settings > Capabilities](https://claude.ai/settings/capabilities)
2. Click "Upload Skill"
3. Select the file you downloaded
4. Wait for the upload to complete

### Step 3: Enable the Skill

1. In the same Settings > Capabilities page
2. Find "Architecture Design" in your skills list
3. Toggle the switch to enable it
4. The skill is now ready to use

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
