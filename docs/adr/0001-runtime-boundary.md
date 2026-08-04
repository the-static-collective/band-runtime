# ADR 0001: Band Runtime is a downstream session layer

- **Status:** Accepted
- **Date:** 2026-08-03

## Decision

Band Runtime is a separate local-first implementation repository for shared session behavior: causal transport, sovereign channels, append-only events, deterministic projections, bounded MCP access, and mix/receipt export.

It consumes Project0 law, reports TranchNode compatibility, and references Corpus OS artifacts. It does not absorb those systems, expand their ontology, or act as an authority plane.

## Consequences

- Project0 remains independently testable and does not import runtime/UI/audio code.
- An implementation failure can be contained without changing the floor.
- Runtime concepts remain namespaced products terms.
- The first proof is an encounter and receipt bundle, not a general collaboration platform.
