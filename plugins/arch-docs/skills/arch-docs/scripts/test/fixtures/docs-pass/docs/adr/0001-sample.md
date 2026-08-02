# ADR 0001: Use Stripe for payments

## Status

Accepted

## Context

The storefront needs a payment processor for checkout.

## Decision

Use Stripe as the payment integration.

## Consequences

Stripe's per-transaction fees apply; PCI scope is reduced since card data never
touches our servers.
