# Architecture Documentation Workflows

## Table of Contents
- Interview Workflow for New Projects
- Interview Workflow for Existing Systems
- Documentation Generation Process
- Update and Maintenance Workflow

## Interview Workflow for New Projects

Gather information through these questions in order:

### Phase 1: Project Context (2-3 questions)
1. **Project basics**: Name, purpose, target users
2. **Timeline**: Launch date, current phase (planning/development/production)
3. **Team**: Size, composition, experience level

### Phase 2: Technical Stack (2-4 questions)
1. **Backend**: Primary language and framework (e.g., "Node.js with Express" or "Python with Django")
2. **Frontend**: Framework or approach (e.g., "React SPA" or "Server-rendered with templates")
3. **Database**: Type and name (e.g., "PostgreSQL" or "MongoDB")
4. **Infrastructure**: Cloud provider or hosting (e.g., "AWS" or "On-premise")

### Phase 3: Architecture Pattern (1-2 questions)
1. **Pattern**: Monolith, microservices, serverless, or hybrid
2. **Rationale**: Why this pattern? (helps understand constraints)

### Phase 4: Components (2-4 questions based on pattern)

For Monolith:
- Main modules or features
- Background jobs or scheduled tasks
- Static asset handling

For Microservices:
- List of services (name and responsibility)
- How services communicate (REST, gRPC, message queue)
- Shared components (API gateway, service mesh)

For Serverless:
- Functions and their triggers
- State management approach
- Event sources

### Phase 5: Data and Integrations (1-3 questions)
1. **Additional data stores**: Cache, search engine, file storage
2. **External services**: Payment, email, analytics, etc.
3. **APIs**: Third-party APIs being consumed

### Phase 6: Operations (1-2 questions)
1. **Deployment**: Manual, CI/CD, orchestration
2. **Monitoring**: Logging, metrics, alerting setup

## Interview Workflow for Existing Systems

For systems already built, adjust approach:

### Quick Assessment
1. **Documentation exists?** If yes, review it first
2. **Codebase access?** If yes, analyze structure
3. **Team knowledge?** Interview developers

### Targeted Questions
1. What's changed since last documentation?
2. What's causing confusion for new developers?
3. What's undocumented or poorly documented?
4. Are there any planned changes?

### Validation Approach
- Cross-reference answers with code
- Identify discrepancies between docs and reality
- Highlight areas needing attention

## Documentation Generation Process

### Step 1: Select Template
Choose based on architecture pattern:
- `assets/ARCHITECTURE.md` for general/unknown
- `assets/ARCHITECTURE-microservices.md` for microservices
- `assets/ARCHITECTURE-monolith.md` for monoliths

### Step 2: Generate System Diagram
Use `scripts/generate_diagram.py` based on pattern:
- Monolith: Use "layered" type
- Microservices: Use "flow" or "c4" type
- Simple systems: Use "simple" type

### Step 3: Fill Template Sections
Populate in this order:
1. Project Identification (Section 10) - establishes context
2. Project Structure (Section 1) - concrete foundation
3. System Diagram (Section 2) - using generated diagram
4. Core Components (Section 3) - from interview data
5. Data Stores (Section 4) - databases and caches
6. External Integrations (Section 5) - third-party services
7. Deployment & Infrastructure (Section 6) - ops details
8. Security Considerations (Section 7) - auth, encryption
9. Development & Testing (Section 8) - dev environment
10. Future Considerations (Section 9) - roadmap items
11. Glossary (Section 11) - domain-specific terms

### Step 4: Enhance with Technology Specifics
Load relevant reference and apply patterns:
- Node.js: See references/nodejs.md
- Python: See references/python.md
- Java: See references/java.md

### Step 5: Validate
Run validation script:
```bash
python scripts/validate_architecture.py ARCHITECTURE.md
```

Address any issues or warnings.

## Update and Maintenance Workflow

### For Incremental Updates
1. Identify changed components
2. Update affected sections only
3. Update "Date of Last Update" in Section 10
4. Add brief note in Future Considerations if major change

### For Major Updates
1. Re-interview on changed areas
2. Regenerate system diagram if structure changed
3. Update multiple sections as needed
4. Consider adding version notes

### Best Practices
- Keep updates small and frequent
- Document changes when they happen
- Review quarterly even if no changes
- Archive old versions if major restructure

## Tips for Effective Interviews

### Keep Questions Focused
- Ask one thing at a time
- Avoid overwhelming with options
- Build on previous answers

### Adapt Based on Responses
- If user is technical, use technical terms
- If user is non-technical, simplify language
- Skip redundant questions

### Handle Uncertainty
- If user unsure, offer to add placeholder
- Suggest reasonable defaults
- Mark uncertain items for review

### Validate Understanding
- Summarize what you heard
- Confirm critical details
- Check for consistency
