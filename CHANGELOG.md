# Changelog

## v3.0.0 (2026-08-10)

A rewrite. The repository shipped a single skill at v2.0.1; it now ships a
Claude Code plugin, `solution-architect`, carrying three skills, installed with
`npx agents-rock`.

### BREAKING CHANGES

Nothing a v2.0.1 user referenced still exists at the same path or under the same
name. The break accumulated across two layout changes, the first of which was
never released, so no single commit carries a `!` marker.

| | v2.0.1 | v3.0.0 |
|---|---|---|
| Unit of install | one skill, files at the repository root | plugin with three skills |
| Skill invoked | `architecture-design` | `arch-docs`, `estimate`, `proposal` |
| Install | copy the root `SKILL.md`, `assets/`, `references/`, `scripts/` | `npx agents-rock` |
| Layout | `./SKILL.md` | `plugins/solution-architect/skills/<name>/` |

Migration: uninstall the old skill by deleting its directory, then run
`npx agents-rock`. There is no automated upgrade path — the old skill's prompts
and assets have no counterpart in the new set.

The last release of the previous layout stays reachable at `v2.0.1`, and the
final plugin-marketplace layout before this rewrite at `v2.1.0-legacy`.

### Added

- **`arch-docs`** — interviews for an architecture, writes `ARCHITECTURE.md` and
  ADRs, then renders a self-contained offline viewer: routed pages, a reading
  rail with a scroll spy, per-section explainers, and pan/zoom diagrams backed by
  LikeC4 and Mermaid. Validation gates rendering.
- **`estimate`** — three-point PERT estimation with project-level spread and risk
  buffers, per-task AI-assist categories, scenario comparison, a component and
  container roster, and a milestone roadmap. Renders a print-ready page with a
  live what-if rail and a client-safe mode that redacts rates.
- **`proposal`** — derives client-facing figures from `estimation.json` and
  renders a print-ready proposal, with checks that refuse any money or duration
  not traceable to the estimate, plus leak and jargon gates.
- **`agents-rock`** — npx installer. Discovers bundled plugins, offers a
  multi-select picker, installs each skill as one canonical copy under
  `.agents/skills/` with per-agent symlinks for Claude Code and Codex, and
  uninstalls by reference count.

### Changed

- Skills are distributed as a plugin under `plugins/`, described by
  `.claude-plugin/marketplace.json`, rather than as loose files at the root.
- Pages embed their own fonts and carry no external URL, so they open from
  `file://` with no network.

### Fixed

- 35 fixes, 22 of them scoped to a skill (15 `arch-docs`, 4 `estimate`,
  3 `proposal`) — mostly the renderer and validators: provenance and link
  checking, companion-document routing, nav construction, and figure
  traceability in `proposal`.

### Known gaps

- `LICENSE` is absent while `package.json` declares MIT.
- No CI: nothing publishes on a tag.

## v2.0.1 (2025-10-22)

Final release of the single-skill layout. See `git log v2.0.1` for detail.
