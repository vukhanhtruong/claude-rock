# AI multipliers — categories, formula, seniority, the blanket-multiplier ban

Read while assigning a `category` to each task and again while choosing
`verificationPct`. Defines what each AI-speedup category means concretely,
how the formula in `estimate-math.mjs` uses it, and the one rule that keeps
an agent from inventing a project-wide speedup number.

## 1. Category table

| Category | AI speedup range | Example tasks |
| --- | --- | --- |
| `boilerplate` | 50-80% | CRUD endpoint, DB migration, form scaffold, DTO/type definitions, config wiring, standard test scaffolding |
| `logic` | 20-40% | validation rules, state machines, pricing/scheduling rules, non-trivial data transforms, API integration glue |
| `novel` | 0-10% | new algorithm design, novel UX interaction, unfamiliar third-party API with thin docs, performance-critical tuning, security-sensitive design |

Pick the category per task, not per feature or per project — a feature that
mixes a CRUD endpoint (`boilerplate`) with a pricing rule engine (`logic`)
has tasks in both categories.

## 2. Formula

The blended AI-adjusted estimate for a task is:

```
(AO + 2×AR + TR) / 4
```

where `TR` is the task's PERT hours with no AI help, `AR` is TR reduced by
the category's average speedup (scaled by seniority), and `AO` is TR reduced
by the category's *maximum* speedup (also scaled by seniority) — the
optimistic case weighted at 1, the average case weighted at 2, so a single
lucky run doesn't drag the whole estimate down. This doc explains the
formula; the code computes it, in `aiAdjust()` in
`scripts/lib/estimate-math.mjs`. Never re-derive this arithmetic by hand or
in prose — call the function.

## 3. Seniority scaling

The speedup a category promises assumes a mid-level engineer driving the AI.
`SENIORITY_FACTOR` scales the reduction:

| Seniority | Factor | Effect |
| --- | --- | --- |
| junior | 1.15 | reduction scaled up — a junior gets more out of AI assistance on well-scoped tasks, closing more of the gap to a senior's baseline speed |
| mid | 1.0 | baseline, no scaling |
| senior | 0.85 | reduction scaled down — a senior is already fast without AI, so the delta AI adds is smaller |

## 4. Verification overhead

Default `verificationPct` is **12%**, added on top of the blended AI-adjusted
hours. AI output is not free to trust: someone still reads the diff, runs
it, and checks it against the actual requirement. Skipping this line item
means the estimate only counts the time to generate code, not the time to
ship code — the two are not the same number.

## 5. Blanket-multiplier prohibition — hard rule

**Never apply a single AI speedup percentage to a whole project or a whole
feature.** Assign category and speedup per task, and let the formula roll
totals up from there.

The reason: a project that is 70% faster on its CRUD tasks is not 70% faster
overall. The CRUD tasks might be 20% of total hours; the other 80% is
`logic` and `novel` work where AI barely moves the needle. Blending at the
project level erases that mix and produces a number nobody can defend.

## Claude Code plan pricing (checked 2026-08, update on renewal)

| Plan | USD/seat/month | Constant |
| --- | --- | --- |
| none | 0 | PLAN_PRICES.none |
| Max 5x | 100 | PLAN_PRICES.max5x |
| Max 20x | 200 | PLAN_PRICES.max20x |

Prices are a manually maintained snapshot. When they change, update BOTH this
table and PLAN_PRICES in scripts/lib/estimate-math.mjs in the same commit.

## Sources

- Formula `(AO + 2×AR + TR) / 4`, per-category reduction ranges, seniority
  gain variation, and the non-uniform-acceleration warning — Kmino,
  *Software Estimation with AI* (kmino.io/blog/software-estimation-with-ai).
  Published practitioner observations, not peer-reviewed data.
- Blanket-multiplier prohibition — Kmino's caveat, promoted to hard rule here.
- Capacity and calibration constants (`HOURS_PER_MONTH`, `COORDINATION_TAX`,
  seniority factors, 12% verification overhead) — this skill's own defaults,
  not sourced; tune against real delivery history.
- Plan prices — manual snapshot, see the dated table above.
