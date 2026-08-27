---
lead: acme-crm
status: CLARIFICATION_REQUIRED
depth: STANDARD
updated: 2026-08-27
readiness: 73
---

# Requirements — Acme CRM invoice approval

## Part 1 — Discovery Brief

Problem: invoice approval is manual; finance spends 3 days per cycle chasing approvers.

| ID | Goal | Metric |
| --- | --- | --- |
| G-001 | Cut invoice approval cycle time | median cycle < 1 day |

Benefit hypothesis: we believe automated approval routing (FR-001) will cut cycle
time, measured by a median approval cycle under 1 day within 3 months.

Constraints: CON-001 — must run inside the client's existing Microsoft 365 tenant.

## Part 2 — Process & Domain

As-is workflow WF-001 (invoice approval): invoice received by email → finance
officer (ACT-001) logs the invoice → emails the manager (ACT-002) for approval →
manager replies → officer pays. Exception: manager on leave — the invoice waits.

| ID | Rule | Examples |
| --- | --- | --- |
| BR-001 | Invoices above $10,000 require manager approval | $8,000 → no approval; $15,000 → approval required |

## Part 3 — Requirements

Scope — out: payment execution. Future: mobile approvals. Unconfirmed: multi-entity support.

| ID | Requirement | Label | Scope |
| --- | --- | --- | --- |
| FR-001 | Route invoices above the approval threshold to a manager | confirmed | in |
| FR-002 | Record an audit trail of every approval decision | assumed | in |

NFR-001 (auditability, assumed): approval decisions retained for 7 years.
INT-001: read invoices from Xero (confirmed).
DAT-001: Invoice — financial sensitivity, about 400 per month (confirmed).

## Part 4 — Acceptance Scenarios

| ID | Given | When | Then |
| --- | --- | --- | --- |
| SC-001 | an invoice of $15,000 | the invoice is submitted | manager approval is requested |
| SC-002 | an invoice of exactly $10,000 | the invoice is submitted | no approval is requested |

## Part 5 — Readiness Report

Readiness: 73%. Areas — businessContext 90, workflows 80, rules 70,
integrations 60, data 70, nfrs 70.

Open questions: Q-001 (P1, architecture blocker) — is the $10,000 threshold in
local currency or USD equivalent?
Assumptions: ASM-001 (high impact, unconfirmed) — managers authenticate through
Microsoft Entra.
Blockers: Q-001, ASM-001. Conflicts: none.
