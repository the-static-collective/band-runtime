# Band Runtime

> The DAW is the room.  
> MCP is the instrument cable.  
> The shared event field is the nervous system.  
> The band is what holds the stack together while it lives.

Band Runtime is a local-first encounter runtime for sovereign humans and agents. It proves that several participants can remain situated inside one evolving encounter without collapsing into a single context window, a canonical mix, or an untraceable consensus.

It is downstream of Project0 and TranchNode/Witness. It does not extend the Project0 ontology.

## The three-layer architecture

- **Project0 enables co-character.** Form together.
- **TranchNode/Witness enables co-inheritance.** Carry together.
- **Band Runtime enables co-faithfulness.** Remain together.

Co- never means merger. Character belongs to particulars-in-relation. Inheritance belongs to lineage-in-transformation. Faithfulness belongs to participation-across-time.

## Record → Recognize → Remain

- **Record:** Did this happen, with provenance, at a declared causal cut?
- **Recognize:** Can what matters be carried forward without rewriting what happened?
- **Remain:** Can participants leave, be interrupted, return, and still inhabit the same living thread?

Artifacts preserve identity. Recognition preserves continuity. Runtime preserves encounter.

Band Runtime computes continuity through encounter.

## Band stack vs call stack

A call stack answers: **who has control right now?**

A band stack answers: **what allows us to remain together while control continually changes?**

Each participant keeps its own private call stack, local memory, timing, intentions, and authority. Band Runtime does not inspect or merge those interiors. Participants deposit attributable events into a shared append-only field. The runtime admits, orders, refuses, re-weights, and projects those events according to declared law.

The event field is stored. Projections are rendered. The band stack is enacted.

Speaker stacks remain an edge metaphor only: a projection can mute a channel without deleting its stem. The PA is not the room, and the house mix is not what happened.

## Load-bearing invariants

- The mix is an artifact, never the authority.
- Recognition changes the future, not the past.
- Muting the house does not erase the stem.
- The groove belongs to the relationship without swallowing the participants.
- Continuity must survive interruption, not merely duration.

## v0.1 gate

> Does this help participants remain together, or merely help produce outputs?

Features that primarily optimize isolated artifact production are out of scope for v0.1.

The first slice is intentionally boring:

- append-only SQLite event log;
- deterministic pure reducer;
- content-addressed artifacts;
- narrow MCP surface that accepts proposals but never mutates projections directly;
- browser room that behaves as a declared projection surface;
- deterministic WAV rendering with recoverable sovereign stems;
- receipt-bundle export proving continuity across interruption.

## Interruption acceptance test

A successful implementation must support this sequence:

1. Open a room and admit several sovereign participants.
2. Deposit attributable, separable clips.
3. Record recognition outcomes.
4. Close the room and stop the process.
5. Reopen from persisted events.
6. Replay at causal cuts before and after recognition.
7. Contest a recognition by appending a new event.
8. Mute a stem in one declared projection without deleting it.
9. Export the receipt bundle.
10. Reconstruct how continuity was established, who intervened, what changed later projections, and what remains unresolved.

A tape recorder can preserve history. Band Runtime must preserve the possibility of faithful return.

## Boundaries

Band Runtime is not:

- a new Project0 ontology;
- a feature inside Corpus OS or TranchNode;
- a full DAW;
- a model sovereign or autonomous conductor;
- a canonical consensus engine;
- a cloud multi-tenant platform;
- a model-training or automatic-canonization system.

If implementation requires rewriting history, inventing a new Project0 node kind, allowing direct projection mutation, hiding disclosure loss, or treating a mix as canonical, stop and open a design tension.

## Contract and implementation map

| Concern | Owner | Band Runtime role |
| --- | --- | --- |
| Meaning-bearing relationships and recognition law | Project0 | Implement a downstream conformance profile |
| Event continuity and addressability | TranchNode/Witness | Report compatible, lossy, or unavailable mappings honestly |
| Corpus ingress and artifact workspace | Corpus OS | Consume/export declared artifact references only |
| Shared time, channels, clips, projections, and mix receipts | Band Runtime | Own local runtime behavior |
| Tool discovery and bounded participant access | MCP | Expose a narrow local instrument surface |

- [Architecture](docs/architecture.md)
- [Project0 conformance profile](docs/project0-profile.md)
- [v0.1 first vertical slice](docs/first-vertical-slice.md)
- [Decision record 0001: repository boundary](docs/adr/0001-runtime-boundary.md)

## Status vocabulary

`exact` · `representable_with_payload` · `lossy` · `unavailable` · `requires_version_boundary`

No integration may silently downgrade one of these states.

## Status

Contract slice only. Runtime code begins after the architecture, event contract, and adversarial fixtures remain mutually consistent.

## Provenance

This repository implements the downstream slice defined by [Project0 issue #25](https://github.com/the-static-collective/project0/issues/25).
