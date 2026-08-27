# AI-specific investigation

Trigger: the solution involves AI, an agent, an LLM, a chatbot, ML
classification, or "automation with judgment". When triggered, work
through all six areas below and fill the json `ai` object (otherwise it
stays `null`).

## Areas

1. **Agent responsibility** — which decisions or actions does the AI
   perform, exactly?
2. **Decision boundary** — for each responsibility: does the AI
   *recommend*, *decide*, or *execute*? Push for one verb per action.
3. **Human-in-the-loop** — which actions require review, approval, or
   escalation, and by whom (an ACT- id)?
4. **Tool access** — which systems may the agent read? Which may it write
   or act on? Map each to an INT- entry.
5. **Failure handling** — expected behavior when confidence is low, input
   is incomplete, a tool fails, results conflict, or policy blocks action.
6. **Evaluation requirements** — representative test cases, expected and
   unacceptable behavior, quality metric, threshold. Ask for real sample
   data ("can you provide 20 contracts with known-good answers?").

## json shape

```json
"ai": {
  "decisionBoundary": [{ "action": "flag risky clauses", "authority": "recommend" }],
  "hitl": [{ "action": "contract approval", "gate": "lawyer review", "actor": "ACT-003" }],
  "toolAccess": [{ "integration": "INT-002", "access": "read" }],
  "failureHandling": [{ "condition": "low confidence", "behavior": "escalate to lawyer queue" }],
  "evalRequirements": [{ "capability": "risky-clause detection", "dataset": "200 representative contracts", "metric": "recall on critical risks", "threshold": ">= 0.95" }]
}
```

Guardrails ("the agent cannot approve contracts") are business rules —
file them as BR- entries and reference them from the affected FR.
