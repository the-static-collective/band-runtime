# Band Runtime

> The DAW is the room.  
> MCP is the instrument cable.  
> The shared event field is the nervous system.  
> The band is the runtime.

Band Runtime is a local-first shared event field for human and agent collaboration. Participants contribute separate, attributable stems to one evolving encounter; the shared mix is playable, but never becomes authority over the voices that formed it.

It is a downstream implementation repository, not a replacement for:

- **Project0** — contribution, challenge, recognition, and authority law;
- **TranchNode** — durable continuity, addressability, and resumable history;
- **Corpus OS** — artifact workspace and historical corpus body;
- **Autodiscography** — a possible historical resonator/instrument library.

## North star

Make a multi-participant encounter possible *inside* the runtime: participants can inspect a bounded shared projection, contribute in their own media, recognize or refuse what occurs, and later replay exactly what was available at any declared causal cut.

## What this is

- a shared session/runtime layer;
- append-only event history plus deterministic, rebuildable projections;
- sovereign participant channels, recoverable stems, and bounded disclosure;
- a browser-room kernel boundary plus narrow MCP surface;
- an audible and inspectable receipt of collaboration.

## What this is not

- a new Project0 ontology;
- a full DAW or autonomous agent conductor;
- a cloud multi-tenant product;
- an AI memory store or consensus engine;
- a system that treats similarity, retrieval, confidence, or a master mix as authority.

## Load-bearing laws

1. **Recognition is intervention.** It may alter later projections only.
2. **History is never rewritten.** Recognition, rejection, anticipation, and contestation append new residues.
3. **Immutable strata; living projection.** Every playable state names its causal cut and policy.
4. **Anticipation is proposal.** It remains visibly/audibly distinct and cannot harden without attributed recognition.
5. **Channels are sovereign.** Authorship, disclosure, refusal, and exportable stems survive every mix.
6. **Foreignness and silence remain available.** The field must not become a sealed self-confirming loop.
7. **Models propose; deterministic admission decides.**

## Current state

**The first runtime kernel is implemented and under active conformance work.**

Current `main` includes the append-only event/store/projection path, idempotent replay, participant and clip encounter events, protected-silence admission/refusal proof, and the bounded `evaluate_artifact_write_admission` MCP tool. The canonical proof surface is the repository test suite plus the MCP admission behavior; the runtime no longer belongs in an “implementation has not begun” state.

**Groove Rooms embodies this runtime; it does not replace it.** Groove Rooms owns the inhabitable room experience—rooms/invites, playback, media UX, participant presence, and branch navigation. Band Runtime owns the encounter/admission/refusal/projection law those surfaces execute against. Product-only playback, authentication, and room UX should stay in Groove Rooms; changes to shared event semantics, protected-silence admission, refusal residue, projection/replay, or MCP admission belong here.

The original [v0.1 first vertical slice](docs/first-vertical-slice.md) is now historical grounding rather than the next task. The next bounded runtime proof is to keep the kernel and Groove Rooms embodiment mechanically aligned: one committed event sequence should yield the same admission/refusal and projection semantics at the runtime boundary and in the inhabitable room, without moving product concerns into this repository.

## Contract and implementation map

| Concern | Owner | Band Runtime role |
| --- | --- | --- |
| Meaning-bearing relationships and recognition law | Project0 | Implement a downstream conformance profile |
| Event continuity and addressability | TranchNode | Report compatible, lossy, or unavailable mappings honestly |
| Corpus ingress and artifact workspace | Corpus OS | Consume/export declared artifact references only |
| Encounter, admission, refusal, projection, replay, and runtime MCP law | Band Runtime | Own local runtime behavior and conformance |
| Rooms, invitations, playback, media UX, participant presence, branch navigation | Groove Rooms | Embody Band Runtime without becoming authority over runtime law |
| Tool discovery and bounded participant access | MCP | Expose a narrow local instrument surface |

- [Architecture](docs/architecture.md)
- [Project0 conformance profile](docs/project0-profile.md)
- [v0.1 first vertical slice](docs/first-vertical-slice.md)
- [Decision record 0001: repository boundary](docs/adr/0001-runtime-boundary.md)
- [Groove Rooms](https://github.com/the-static-collective/groove-rooms)

## Status vocabulary

`exact` · `representable_with_payload` · `lossy` · `unavailable` · `requires_version_boundary`

No integration may silently downgrade one of these states.

## Provenance

This repository implements the downstream slice defined by [Project0 issue #25](https://github.com/the-static-collective/project0/issues/25).
