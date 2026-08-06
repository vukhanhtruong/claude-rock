---
client: Acme Corp
client_tech_level: non-tech
scenario: 2eng-max5x
currency: USD
valid_until: 2099-12-31
source_architecture: ../ARCHITECTURE.md
source_estimation: ../estimation.json
---

# Acme Corp — Proposal

## Executive Summary
Your customers book by phone today; every double-booking costs you a client. We will build an online booking system for $3,400 – $10,300, delivered in 0.2–0.7 months by a two-person team.

## Background & Objectives
Acme staff manage appointments by hand. The goal: customers book online, reminders go out automatically, and no slot is ever double-booked, live within 0.7 months.

## Proposed Solution
One new system with two parts: the booking page your customers see, and reminders that go out on their own.

```mermaid
graph LR; C[Your customers] --> B[Online booking] --> R[Automatic reminders]
```

## Scope
| Feature | What you get |
| --- | --- |
| Online booking | Customers pick a free slot; double-booking is impossible |
| Automatic reminders | Customers get an email before their appointment |

## Out of Scope & Assumptions
- Text-message reminders are not included.
- Recurring bookings are not included.
- We assume all bookings happen in a single timezone.

## Delivery Approach
Two milestones. M1 - Booking core runs 0.2–0.5 months; M2 - Notifications runs 0.1–0.2 months. You see a working demo every week, and each milestone ends with your sign-off.

## Investment & Timeline
| Milestone | Duration | Investment |
| --- | --- | --- |
| M1 - Booking core | 0.2–0.5 months | $2,600 – $7,700 |
| M2 - Notifications | 0.1–0.2 months | $900 – $2,600 |

**Total: $3,400 – $10,300 over 0.2–0.7 months.** The range reflects estimation confidence; we confirm a fixed price before each milestone begins.

## Team
One senior engineer and one mid-level engineer, working with AI-assisted tooling.

## About Code Engine Studio
We build custom software for small businesses. Recent work: a clinic scheduling system and a salon booking app. Contact: hello@codeenginestudio.com

## Next Steps
This proposal is valid until 2099-12-31. To proceed, reply with your acceptance and we schedule the kick-off call within one week.
