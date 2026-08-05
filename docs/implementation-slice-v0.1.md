# Implementation Slice v0.1 — Sovereignty-Preserving Admission Kernel

Tracks issue #5.

## Purpose

This slice converts Band Runtime's constitutional laws into executable admission behavior without building the full room, DAW, MCP surface, or agent orchestration layer.

## Transactional law

> Forbidden attempts may change history only by appending an attributable refusal receipt. The receipt proves the attempt and its failure; it carries no semantic weight toward the attempted effect and cannot be counted, weighted, indexed, embedded, or projected as support for that effect.

## Required delivery

### Documentation

- `docs/sovereignty-rights.md`
- `docs/refusal-proof-law.md`
- `docs/admission-order.md`

### Schemas

- `schemas/events/boundary-refusal-receipt.schema.json`
- `schemas/events/protected-silence.schema.json`
- `schemas/events/anticipation-proposal.schema.json`

### Kernel

- ordered admission pipeline
- pure boundary gates
- distinct outcomes for validation failure, boundary refusal, and admissible rejection
- refusal-only projector
- protected-silence lifecycle
- deterministic replay hooks

### Fixtures

- five hostile boundary fixtures
- hostile walk-away fixture
- silence-declaration race fixture
- canonical replay fixture
- policy replay fixture

## Non-negotiable admission order

1. Authenticate and attribute actor.
2. Verify disclosure and scope.
3. Verify temporal position and causal cut.
4. Enforce protected silence, foreignness hook, and protected-region rules.
5. Evaluate recognition authority.
6. Decide admission, refusal, or validation failure.
7. Append the exact durable residue.
8. Only then update projections.

Projection-before-append is a violation.

## Required refusal semantics

A refusal receipt must:

- bind the attempted artifact and payload hash;
- identify the actor and actor-local sequence;
- identify boundary, reason, causal cut, policy version, policy input, and evaluator version;
- identify attempted effects and protected target references;
- prove per-artifact non-mutation with equal before/after content hashes;
- declare `semanticEffect: "none"`;
- declare `projectionClassification: "refusal_only"`;
- carry an explicit disclosure envelope;
- remain unavailable to recognition, anticipation, retrieval, indexing, embedding, consensus, relevance, or canonization calculations.

Repeated refusals may support operational rate control or key-compromise investigation. They never support the attempted effect.

## Protected silence

Protected silence is explicit, attributable, causally addressed, reconstructable, non-generative, non-consensual, and unavailable for inference-filling.

Ending protection changes future admissibility only. It never rewrites or fills the protected interval. The declarer may end their own silence by default; any alternate terminating authority must be predeclared in policy.

## Stop conditions

Stop and report rather than inventing a local law if implementation requires:

- new universal Project0 ontology kinds;
- a competing canonical addressing scheme;
- weakened TranchNode authority or ordering semantics;
- mutable history;
- projection-before-append;
- refusal evidence supporting the attempted effect;
- silent deletion of the only accountable refusal residue.

## Completion criterion

Every prohibited attempt receives a deterministic disposition. A refused attempt mutates no protected artifact, appends an attributable and policy-bound receipt, leaves all earlier cuts unchanged, appears only as refusal to authorized audiences, and remains reconstructable after interruption without semantic promotion.
