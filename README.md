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

Make a multi-participant encounter possible _inside_ the runtime: participants can inspect a bounded shared projection, contribute in their own media, recognize or refuse what occurs, and later replay exactly what was available at any declared causal cut.

## What this is

- a shared session/runtime layer;
- append-only event history plus deterministic, rebuildable projections;
- sovereign participant channels, recoverable stems, and bounded disclosure;
- a future browser room, local event service, and narrow MCP surface;
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

**Repository initialized. Runtime implementation has not begun.**

The next bounded build is [the v0.1 first vertical slice](docs/first-vertical-slice.md). It is specified before code so the kernel cannot drift into a generic multiplayer chat or a hidden authority system.

## Contract and implementation map

| Concern                                                     | Owner        | Band Runtime role                                          |
| ----------------------------------------------------------- | ------------ | ---------------------------------------------------------- |
| Meaning-bearing relationships and recognition law           | Project0     | Implement a downstream conformance profile                 |
| Event continuity and addressability                         | TranchNode   | Report compatible, lossy, or unavailable mappings honestly |
| Corpus ingress and artifact workspace                       | Corpus OS    | Consume/export declared artifact references only           |
| Shared time, channels, clips, projections, and mix receipts | Band Runtime | Own local runtime behavior                                 |
| Tool discovery and bounded participant access               | MCP          | Expose a narrow local instrument surface                   |

- [Architecture](docs/architecture.md)
- [Project0 conformance profile](docs/project0-profile.md)
- [v0.1 first vertical slice](docs/first-vertical-slice.md)
- [Decision record 0001: repository boundary](docs/adr/0001-runtime-boundary.md)

## Status vocabulary

`exact` · `representable_with_payload` · `lossy` · `unavailable` · `requires_version_boundary`

No integration may silently downgrade one of these states.

## Provenance

This repository implements the downstream slice defined by [Project0 issue #25](https://github.com/the-static-collective/project0/issues/25).
