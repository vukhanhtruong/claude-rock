# Project Types — detection, elections, table variants

Read to detect project type (SKILL.md step 3) and to pick per-type companion
elections and table-column variants when writing (`writing.md`).

## Detection

| type | signals |
|---|---|
| web/SaaS | `package.json` + an HTTP framework dependency (Express, Fastify, Next.js, Rails, Django...) |
| AI/LLM app | model configs, a `prompts/` directory, or a vector-store dependency (pgvector, Pinecone, Chroma...) |
| ML/data pipeline | `dvc`, `airflow`, or `dbt` present (config or dependency) |
| mobile | Gradle build files plus Swift or Kotlin source directories |
| CLI/library | a `bin` entry with no server-framework dependency |
| embedded/IoT | PlatformIO, Zephyr, or another firmware toolchain config |

Confidence is high when exactly one row's signals match. Otherwise ask the
project-type confirmation question (`interview.md`).

## Election matrix

Copied verbatim from the design spec (§3.2 Companion documents):

| Companion | Elected when | Per-type variant |
|---|---|---|
| threat-model.md | non-trivial attack surface | STRIDE · OWASP LLM Top 10 2025 · data lineage/PII · device+transport · physical+firmware |
| interface contract | system exposes/consumes interfaces | OpenAPI · +tool schemas · data contracts +model card +datasheet · wire protocol · public API surface |
| estimation.md | user wants effort estimates | confidence + assumptions per row; unestimated rows say so |
| DOMAIN-OVERVIEW.md | domain-heavy project (fintech, health, logistics…) | — |

DOMAIN-OVERVIEW.md is never elected silently on a heuristic guess: the
interview's domain rows (`interview.md`) confirm domain-heaviness first.
estimation.md is elected only when the user asks for effort estimates — never
by default. An un-elected companion is still recorded in frontmatter
`electedDocs`, with the reason.

## Table-column variants (§6 / §8 / §9 / §10)

Base spine columns (defined in `writing.md`) apply to every type unless a row
below adds to or overrides them.

| type | §6 Core Components | §8 Data Stores | §9 External Integrations | §10 Deployment & Infrastructure |
|---|---|---|---|---|
| web/SaaS | no variant | no variant | no variant | no variant |
| AI/LLM app | no variant | no variant | no variant | no variant |
| ML/data pipeline | no variant | adds `lineage` column | no variant | no variant |
| mobile | adds `offline behaviour` column | no variant | no variant | no variant |
| CLI/library | no variant | no variant | no variant | renders `Not applicable — no deployment: distributed as a binary/package` |
| embedded/IoT | no variant | no variant | adds `wire protocol` column | no variant |

## Fixed spine

The 16 headings never change, regardless of project type. A section that does
not apply to this project renders exactly one line:
`Not applicable — <reason>`. Project type varies table columns (above) and
companion doc elections (above) only — never the heading list itself.
