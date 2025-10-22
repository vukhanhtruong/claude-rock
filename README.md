# Architecture Design - Claude Skill

A comprehensive Claude skill for creating professional software architecture documentation through guided interviews and template-based generation.

## Overview

The Architecture Design skill transforms Claude into an expert architecture consultant capable of generating detailed, standardized ARCHITECTURE.md files. It helps development teams create comprehensive documentation that accelerates onboarding and improves system understanding.

## Features

### Core Capabilities

- **Interactive Architecture Interviews**: Guided sessions to gather system information (5-7 questions)
- **Template-Based Generation**: Creates structured documentation following proven templates
- **Multi-Stack Support**: Supports Node.js, Python, Java, Go, .NET technology stacks
- **Pattern Support**: Monolith, microservices, and serverless architectures
- **Visual Diagrams**: Generates ASCII/Unicode system diagrams and C4 model representations
- **Advanced Features**: Mermaid diagrams, OpenAPI specs, PDF generation, ZIP packaging

### Supported Templates

- **Standard Template**: General-purpose architecture documentation
- **Microservices Template**: Specialized for distributed systems
- **Monolith Template**: Optimized for traditional applications

## Installation

### Step 1: Download the Skill

1. Download the [latest release](https://github.com/vukhanhtruong/claude-skill-architecture-design/releases/latest) zip file
2. Save it to your computer

### Step 2: Upload to Claude

1. Go to [Settings > Capabilities](https://claude.ai/settings/capabilities)
2. Click "Upload Skill" or "Add Custom Skill"
3. Select the `architecture-design.skill` file you downloaded
4. Wait for the upload to complete

### Step 3: Enable the Skill

1. In the same Settings > Capabilities page
2. Find "Architecture Design" in your skills list
3. Toggle the switch to enable it
4. The skill is now ready to use

## How to Use

### Trigger the Skill

Say any of these:

- "Create architecture documentation"
- "Document my system architecture"
- "Design a new architecture"

### Usage Examples

```
"Create architecture documentation for my Node.js e-commerce platform"
```

```
"Design an architecture for an e-commerce application using Java Spring Boot microservices"
```

```
"Create a full package of architecture diagram for my serverless application on AWS"
```

```
"Generate architecture for my Python Django application"
```

#### Need to update? Just say:

`"Update the architecture documentation"`

`"Add Redis cache to the architecture"`

`"Document the new services"`

### Answer Questions

The skill will ask 5-7 questions about:

- Architecture pattern (monolith/microservices/serverless)
- Technology stack (Node.js/Python/Java/etc.)
- Components and services
- Data stores
- Deployment infrastructure

### Receive Documentation

Get a complete ARCHITECTURE.md with:

- All 11 required sections

```sh
  1. Project Structure
  2. High-Level System Diagram
  3. Core Components
  4. Data Stores
  5. External Integrations / APIs
  6. Deployment & Infrastructure
  7. Security Considerations
  8. Development & Testing Environment
  9. Future Considerations / Roadmap
  10. Project Identification
  11. Glossary / Acronyms
```

- System diagrams
- Technology-specific patterns
- Best practices
- Validated for completeness

## What You Get

### ARCHITECTURE.md File

- Comprehensive documentation
- Professional format
- Technology-specific patterns
- Validated completeness
- Ready to commit to repo

### Enhanced Features (when requested)

- **Visual Diagrams** - Mermaid.js diagrams (C4 Context, Container, Component, Data Flow, Deployment)
- **API Specifications** - OpenAPI 3.0 compliant documentation
- **PDF Version** - Professionally formatted documentation
- **ZIP Package** - Organized deliverable with all files

### System Diagrams

- ASCII-based (version control friendly)
- Multiple diagram types
- Clear component relationships
- Data flow visualization

### Package Structure

```
architecture-package.zip
├── ARCHITECTURE.md          # Main documentation
├── ARCHITECTURE.pdf         # PDF version (if requested)
├── openapi.json            # API specification (if applicable)
└── diagrams/               # Visual documentation
    ├── 01-context.png      # System context diagram
    ├── 02-container.png    # Container diagram
    ├── 03-component.png    # Component diagram
    ├── 04-dataflow.png     # Data flow diagram
    ├── 05-deployment.png   # Deployment diagram
    └── source/             # Editable source files
        ├── 01-context.mmd
        ├── 02-container.mmd
        ├── 03-component.mmd
        ├── 04-dataflow.mmd
        └── 05-deployment.mmd
```

## Speed & Efficiency

- **Questions**: 5-7 focused questions
- **Time**: 2-3 minutes to complete
- **Output**: Comprehensive 11-section document
- **Quality**: Professional, validated, complete

## Pro Tips

### For New Projects

- Be clear about your architecture goals
- Mention any constraints upfront
- Specify your tech preferences

### For Existing Systems

- Describe current pain points
- Mention planned improvements
- Identify undocumented areas

### For Best Results

- Answer questions completely
- Provide specific names (not generic terms)
- Mention actual tools and services you use
- Let the skill know your deployment target

## Key Benefits

1. **Consistency**: Standard format every time
2. **Completeness**: No missing sections
3. **Specificity**: Your tech stack, your patterns
4. **Speed**: Minutes instead of hours
5. **Quality**: Industry best practices included
6. **Validation**: Automatic checks for completeness

## Technology Support

### Backend Technologies

- Node.js (Express, NestJS, Fastify)
- Python (Django, Flask, FastAPI)
- Java (Spring Boot, Quarkus)
- Go (Gin, Echo, Chi)
- .NET (ASP.NET Core)

### Frontend Technologies

- React, Vue.js, Angular
- Next.js, Nuxt.js
- Swift/Kotlin for mobile

### Databases

- PostgreSQL, MySQL, SQLite
- MongoDB, Cassandra
- Redis, Memcached

### Cloud Platforms

- AWS, Google Cloud, Azure
- Serverless (Lambda, Cloud Functions)
- Kubernetes, Docker

## Skill Structure

```
architecture-design/
├── SKILL.md                    # Core skill logic (427 lines)
├── scripts/                    # Automation tools
│   ├── validate_architecture.py
│   ├── generate_diagram.py
│   ├── generate_mermaid.py
│   ├── generate_openapi.py
│   └── create_package.py
├── references/                 # Technology guides
│   ├── nodejs.md
│   ├── python.md
│   ├── java.md
│   ├── microservices.md
│   ├── serverless.md
│   └── mermaid-diagrams.md
└── assets/                     # Document templates
    ├── ARCHITECTURE.md
    ├── ARCHITECTURE-microservices.md
    └── ARCHITECTURE-monolith.md
```

## Quality Assurance

- All scripts tested and validated
- Documentation completeness checks
- Structure validation for packages
- Quality scoring and suggestions
- Progressive disclosure for efficiency

## Troubleshooting

### Skill Not Working

1. Verify the skill is enabled in Settings > Capabilities
2. Try refreshing Claude and starting a new conversation
3. Check that you're using the correct trigger phrases

### PDF Generation Issues

- PDF generation requires optional tools (pandoc or WeasyPrint)
- If tools aren't available, you'll get clear instructions to install them
- The skill still works without PDF generation

### Diagram Rendering

- Mermaid diagrams can be rendered to PNG with `@mermaid-js/mermaid-cli`
- If not available, you'll get the .mmd source files instead
- These can be rendered later using online Mermaid editors

## Support

For questions or issues:

1. Check the documentation in the skill references
2. Review the validation output for specific guidance
3. Use the skill's built-in help: "Show architecture skill help"
4. Create an issue on the skill's GitHub [repository](https://github.com/vukhanhtruong/claude-skill-architecture-design/issues)
