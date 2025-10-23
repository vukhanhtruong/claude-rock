---
name: architecture-design
description: Creates comprehensive software architecture documentation (ARCHITECTURE.md) with Mermaid diagrams, OpenAPI specifications, and PDF output through guided interviews. Use when users need to document system architecture, create architecture diagrams, design new systems, generate API specifications, or create complete documentation packages. Supports multiple technology stacks (Node.js, Python, Java, .NET, Go) and architectural patterns (monolith, microservices, serverless). Generates 5 C4 model Mermaid diagrams and packages everything as ZIP.
---

# Architecture Design Expert

Create professional ARCHITECTURE.md documentation with visual diagrams and API specifications through structured interviews. Generate complete documentation covering all 11 required sections with technology-specific guidance, 5 Mermaid.js diagrams (C4 Context, Container, Component, Data Flow, Deployment), OpenAPI 3.0 specifications, PDF output, and comprehensive ZIP packages.

## Core Workflow

### Step 1: Assess Project Type

Ask user about their project:

- **New project?** Gather requirements and design architecture
- **Existing system?** Document current state
- **Update needed?** Identify changed components

### Step 2: Gather Essential Information

Conduct brief interview (5-7 questions maximum):

1. **Architecture pattern:** Monolith, microservices, or serverless?
2. **Primary technology:** Node.js, Python, Java, or other?
3. **Key components:** Main services or modules?
4. **Data stores:** Databases and caches?
5. **Cloud provider:** AWS, GCP, Azure, or on-premise?
6. **Deployment:** How is it deployed?
7. **External integrations:** Third-party services?

### Step 3: Select Template and Load References

**Choose template based on pattern:**

- Monolith → `assets/ARCHITECTURE-monolith.md`
- Microservices → `assets/ARCHITECTURE-microservices.md`
- Uncertain → `assets/ARCHITECTURE.md`

**Load technology reference if needed:**

- Node.js project → Load `references/nodejs.md`
- Python project → Load `references/python.md`
- Java project → Load `references/java.md`

**Load pattern reference if helpful:**

- Microservices → Load `references/microservices.md`
- Serverless → Load `references/serverless.md`

### Step 4: Generate System Diagram

Use `scripts/generate_diagram.py`:

**For monoliths:**

```bash
python scripts/generate_diagram.py layered
```

**For microservices:**

```bash
python scripts/generate_diagram.py flow
```

**For simple systems:**

```bash
python scripts/generate_diagram.py simple
```

Customize with JSON config for specific components.

### Step 5: Populate Template

Fill template sections in order:

1. **Project Identification (Section 10)** - Name, repo, contact, date
2. **Project Structure (Section 1)** - Directory layout
3. **System Diagram (Section 2)** - Use generated diagram
4. **Core Components (Section 3)** - From interview
5. **Data Stores (Section 4)** - Databases, caches
6. **External Integrations (Section 5)** - Third-party services
7. **Deployment (Section 6)** - Infrastructure details
8. **Security (Section 7)** - Auth, encryption
9. **Development (Section 8)** - Setup, testing
10. **Future Considerations (Section 9)** - Roadmap items
11. **Glossary (Section 11)** - Domain terms

Apply technology-specific patterns from loaded references.

### Step 6: Validate

Run validation script:

```bash
python scripts/validate_architecture.py ARCHITECTURE.md
```

Fix any issues or warnings before delivering.

## Interview Best Practices

**Keep questions focused:**

- Ask 2-3 questions at a time
- Build on previous answers
- Skip redundant questions

**Adapt to user:**

- Technical users: Use precise terminology
- Non-technical: Simplify language
- Uncertain: Offer defaults or placeholders

**Handle gaps:**

- Mark uncertain items for review
- Add [TODO] for missing information
- Suggest reasonable defaults

## Technology-Specific Guidance

### When to Load References

**Load `references/nodejs.md` for:**

- Express, NestJS, Fastify projects
- Node.js microservices
- Serverless Node functions

**Load `references/python.md` for:**

- Django, Flask, FastAPI projects
- Python microservices
- Data pipelines

**Load `references/java.md` for:**

- Spring Boot applications
- Jakarta EE systems
- Java microservices

**Load `references/workflows.md` for:**

- Complex interview scenarios
- Detailed process guidance
- Update workflows

### Applying Technology Patterns

After loading reference, use it to enhance:

- Project structure recommendations
- Deployment configurations
- Framework-specific best practices
- Common library suggestions
- Testing approach

## Pattern-Specific Guidance

### Microservices Projects

**Load `references/microservices.md` and include:**

- Service boundaries and responsibilities
- Communication patterns (sync vs async)
- API gateway configuration
- Service discovery mechanism
- Data management approach
- Observability setup

**Use microservices template** for proper structure.

### Serverless Projects

**Load `references/serverless.md` and include:**

- Function organization
- Event sources and triggers
- State management approach
- Cold start mitigation
- Cost optimization strategies

### Monolithic Projects

**Use monolith template** and emphasize:

- Layered architecture
- Module organization
- Potential future refactoring
- Scaling strategy

## Diagram Generation

### Simple Diagram

```bash
python scripts/generate_diagram.py simple '{"components": ["User", "API", "DB"], "connections": [["User", "API"], ["API", "DB"]]}'
```

### Layered Diagram

```bash
python scripts/generate_diagram.py layered '{"Presentation": ["Web UI"], "Business": ["API"], "Data": ["PostgreSQL"]}'
```

### Flow Diagram

```bash
python scripts/generate_diagram.py flow '[{"from": "Client", "to": "Gateway", "label": "HTTP"}, {"from": "Gateway", "to": "Service", "label": "route"}]'
```

### C4 Context Diagram

```bash
python scripts/generate_diagram.py c4 '{"system": "E-commerce Platform", "actors": ["Customer", "Admin"], "external_systems": ["Payment Gateway", "Email Service"]}'
```

Integrate generated diagrams into Section 2.

## Validation

**Run before delivering:**

```bash
python scripts/validate_architecture.py ARCHITECTURE.md
```

**Checks performed:**

- All 11 sections present
- Required fields in Project Identification
- Minimal content in each section
- Placeholder count

**Address warnings** about missing content or excessive placeholders.

## Update Workflow

**For incremental updates:**

1. Ask what changed
2. Update affected sections only
3. Update date in Section 10
4. Re-run validation

**For major updates:**

1. Review entire document
2. Regenerate diagrams if structure changed
3. Update multiple sections
4. Consider version note

## Mermaid Diagram Generation

After creating ARCHITECTURE.md, generate 5 Mermaid diagrams.

### Load Mermaid Instructions

When user requests diagrams or complete package:

```
Load references/mermaid-diagrams.md
```

### Generate Diagrams

Create all 5 diagrams following mermaid-diagrams.md:

1. **C4 Context** (Level 1) - System in context
2. **C4 Container** (Level 2) - Main components
3. **C4 Component** (Level 3) - Internal structure
4. **Data Flow** - How data moves
5. **C4 Deployment** - Infrastructure topology

Use `scripts/generate_mermaid.py` with system JSON config.

**Save as separate .mmd files:**

- `01-context.mmd`
- `02-container.mmd`
- `03-component.mmd`
- `04-dataflow.mmd`
- `05-deployment.mmd`

**Embed in ARCHITECTURE.md Section 2** as code blocks.

## OpenAPI Specification Generation

For systems with APIs, generate OpenAPI 3.0 spec.

### Generate API Spec

Use `scripts/generate_openapi.py`:

**For simple CRUD:**

```bash
python scripts/generate_openapi.py "ResourceName"
```

**For custom APIs:**

```bash
python scripts/generate_openapi.py '{"system_name": "...", "endpoints": [...]}'
```

Save as `openapi.json`.

## PDF and Package Creation

Create comprehensive deliverable package.

### Generate PDF

Convert ARCHITECTURE.md to PDF using:

- Pandoc (preferred)
- WeasyPrint (fallback)
- Notice file if tools unavailable

### Create ZIP Package

Use `scripts/create_package.py`:

```bash
python scripts/create_package.py <work_dir> <output.zip>
```

**Package contents:**

```
architecture-package.zip
├── ARCHITECTURE.md
├── ARCHITECTURE.pdf
├── openapi.json
└── diagrams/
    ├── 01-context.png
    ├── 02-container.png
    ├── 03-component.png
    ├── 04-dataflow.png
    ├── 05-deployment.png
    └── source/
        ├── 01-context.mmd
        ├── 02-container.mmd
        ├── 03-component.mmd
        ├── 04-dataflow.mmd
        └── 05-deployment.mmd
```

## Complete Workflow

1. **Interview** (5-7 questions)
2. **Select template** and **load references**
3. **Generate ARCHITECTURE.md** in current work directory (all 11 sections)
4. **Generate Mermaid diagrams** (5 .mmd files) in work directory root
5. **Generate OpenAPI spec** (if applicable) in work directory
6. **Package**:
   - Converts MD to PDF
   - Renders .mmd to PNG (in diagrams/)
   - Creates ZIP with proper structure
7. **Deliver** complete package

## Proper ZIP File Organization

**Work directory structure:**

```
(current directory)
├── ARCHITECTURE.md
├── openapi.json
├── *.mmd (5 files)
└── diagrams/ (created during packaging)
    └── *.png (5 files, if rendered)
```

**Final ZIP structure:**

```
architecture-package.zip
├── ARCHITECTURE.md
├── ARCHITECTURE.pdf
├── openapi.json
└── diagrams/
    ├── *.png (5 rendered images)
    └── source/
        └── *.mmd (5 source files)
```

**Critical:** .mmd files go in `diagrams/source/`, NOT root. Use `create_package.py` for correct structure.

## Output Format

**Final package location:**

```
/mnt/user-data/outputs/architecture-package.zip
```

**Contents structure:** See "Proper File Organization" above.

**After completion:**

1. Validate and report status
2. Provide download link
3. Summarize package contents

## Example Usage

**User:** "Create architecture documentation for my Node.js microservices project"

**Response:**

1. Select microservices template
2. Load references/nodejs.md and references/microservices.md
3. Interview: services, databases, communication, deployment
4. Generate flow diagram
5. Populate all sections with Node.js and microservices patterns
6. Validate
7. Create ARCHITECTURE.md in outputs

## Common Scenarios

### Scenario 1: New Greenfield Project

- Use base template
- Focus on design decisions
- Include rationale for choices
- Emphasize planned architecture

### Scenario 2: Existing System

- Ask about current pain points
- Document as-is state
- Note planned improvements in Section 9

### Scenario 3: Legacy System

- Identify undocumented areas
- Mark uncertain items
- Suggest areas for clarification

### Scenario 4: Architecture Review

- Update changed sections
- Keep what's still accurate
- Add new components
- Update date

## Tips

**Efficient documentation:**

- Start with what's known
- Use placeholders for unknowns
- Technology references save time
- Validate early, validate often

**Quality output:**

- Be specific, not generic
- Include actual tech stack details
- Real service names and purposes
- Concrete deployment information

**User experience:**

- Don't overwhelm with questions
- Explain what you're doing
- Show progress through sections
- Offer to refine afterward
