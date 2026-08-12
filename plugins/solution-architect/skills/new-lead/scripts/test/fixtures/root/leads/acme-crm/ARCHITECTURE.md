# Acme CRM — Architecture

## 1. Introduction & Goals

Acme wants a rebuilt CRM to support omnichannel sales workflows.

## 6. Core Components

| Component | Responsibility |
|---|---|
| `atlas.api` | Serves REST endpoints for the CRM backend |
| `atlas.web` | Renders the CRM web application |

## 7. Runtime Behaviour

Requests flow from `atlas.web` to `atlas.api` over HTTPS.
