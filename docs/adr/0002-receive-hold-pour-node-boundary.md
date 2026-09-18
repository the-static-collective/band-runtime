# ADR 0002 — RECEIVE → HOLD → POUR Node Boundary

**Status:** proposed / research-hardening  
**Date:** 2026-09-18  
**Authority:** none beyond Band Runtime's local repository boundary

## Context

Band Runtime already owns local encounter, admission, refusal, projection, replay, and the bounded MCP server seam.

TranchNode separately owns durable continuity, addressability, resumable history, staged handoff, and the current STATIC-NODE-001 `HOLD` proof.

The emerging server-node pattern is:

```
RECEIVE -> HOLD -> POUR
```

with server nodes acting as explicit in/out doors rather than sovereign centers.

This ADR hardens that pattern without creating a new universal ontology, transport protocol, network authority, or automatic forwarding system.

## Decision

A Band Runtime server node is modeled as a bounded local vessel with two explicit crossing surfaces:

```
        IN DOOR
           |
           v
        RECEIVE
           |
           v
         HOLD
           |
           v
         POUR
           |
           v
        OUT DOOR
```

The node may witness, evaluate, retain, project, refuse, and emit according to local law.

The node does not become the source of authority merely because material passed through it.

## RECEIVE

`RECEIVE` means:

> Material, a request, a signal, a contribution, or a reference has reached the node's inbound boundary and has an attributable arrival.

Receiving is not admission.

```
RECEIVE != ADMIT
REACHABLE != ACCEPTED
DELIVERED != TRUSTED
VISIBLE != EXECUTABLE
```

A lawful receive surface should preserve enough information to distinguish at least:

- source or source reference, when available;
- arrival occurrence;
- carrier/transport class, when relevant;
- declared purpose or attempted operation, when available;
- policy/admission context;
- refusal or quarantine outcome;
- provenance/receipt references.

A node may lawfully receive and then refuse, quarantine, ignore, or hold material inert.

## HOLD

`HOLD` means:

> The node locally preserves whatever state, evidence, residue, or responsibility it is permitted and able to preserve without claiming ownership or promotion.

Holding is not ownership.

```
HOLD != OWN
HOLD != ENDORSE
HOLD != PUBLISH
HOLD != PROMOTE
HOLD != EXECUTE
```

A HOLD may preserve:

- causal history;
- native references;
- unresolved questions;
- refusal residue;
- protected silence;
- disclosure constraints;
- participant attribution;
- replay material;
- continuity references;
- bounded local projections.

Durable continuity belongs to TranchNode where that boundary is crossed.

Band Runtime may hold runtime-local state, but it must not silently replace TranchNode's continuity/addressability jurisdiction.

A lawful HOLD may also be intentionally empty.

```
EMPTY HOLD != FAILED HOLD
```

An owner may truthfully declare that nothing has yet been admitted, projected, retained, or exposed through a given interface.

Absence must not be repaired by fabrication.

## POUR

`POUR` means:

> The node intentionally emits a bounded output, reference, projection, receipt, or proposed crossing through an explicit outbound surface.

Pouring is not authorization of the receiver.

```
POUR != AUTHORIZE
POUR != CONSTITUTE
POUR != FORCE ADMISSION
POUR != TRANSFER OWNERSHIP
POUR != TRANSFER AUTHORITY
```

A pour should preserve:

- what was emitted;
- by which local operation;
- from which causal cut/state;
- under which disclosure/admission policy;
- with which native references;
- with which receipt;
- what the pour explicitly does not establish.

The receiving side remains sovereign over its own admission and consequence.

```
POUR(A -> B)
!=
ADMIT_B
```

## The doors

A server node has two conceptual doors.

### In door

The in door is a crossing boundary.

It answers:

- what arrived?
- from where?
- under what declared attempt?
- what local policy was consulted?
- was the arrival admitted, refused, quarantined, or left inert?

The in door does not infer trust from transport success.

### Out door

The out door is also a crossing boundary.

It answers:

- what is leaving?
- which local state/cut produced it?
- what may the receiver lawfully infer from it?
- what remains local?
- what authority, if any, is explicitly carried?

The out door does not infer receiver consequence from successful emission.

## Core laws

```
RECEIVE != ADMIT
HOLD != OWN
POUR != AUTHORIZE

INGRESS != TRUST
RESIDENCE != POSSESSION
EGRESS != CONSEQUENCE

SERVER != SOVEREIGN CENTER
TRANSPORT != AUTHORITY
PROJECTION != CONSTITUTION

A NODE MAY CARRY HISTORY
WITHOUT OWNING THE THING WHOSE HISTORY IT CARRIES.

A NODE MAY EMIT A POSSIBILITY
WITHOUT GRANTING THE RECEIVER PERMISSION TO ACT ON IT.
```

## Jurisdiction

### Band Runtime

Owns local:

- encounter;
- admission;
- refusal;
- protected silence behavior;
- projection;
- replay;
- runtime MCP evaluation;
- node-local receive/pour behavior when implemented.

### TranchNode

Owns durable:

- continuity;
- addressability;
- resumable history;
- staged responsibility transfer;
- continuity receipts;
- Static Node HOLD semantics where those are invoked.

### Project0

Owns or anchors:

- contribution/recognition/authority law;
- identity and authority relationships where explicitly constituted;
- portable crossing/Whole Return contracts where adopted.

### Receiving repository/system

Owns:

- local admission;
- local interpretation;
- local consequence;
- local authority.

No node may silently promote its own receipt into another repository's authority.

## Relationship to BODY surfaces

A node may lawfully publish a BODY surface whose `provides`, `needs`, or `interfaces` are empty when no stable interface has yet been truthfully declared.

```
PRESENT + EMPTY
>
FABRICATED + COMPLETE
```

The empty body entry is still an attributable occurrence.

Later declarations must not be backdated merely because they now fit the earlier shape.

```
LATER INTERFACE
!=
EARLIER INTERFACE RETROACTIVELY
```

## Hostile cases

### H1 — transport success laundering trust

Material reaches the in door successfully.

Invalid inference:

```
DELIVERED -> TRUSTED
```

Required result:

```
RECEIVED
+
LOCAL ADMISSION STILL REQUIRED
```

### H2 — HOLD laundering ownership

Material remains resident or replayable at the node.

Invalid inference:

```
HELD -> OWNED
```

Required result:

```
HELD
+
ORIGIN/RIGHTS/AUTHORITY REMAIN EXPLICIT
```

### H3 — POUR laundering receiver authority

The node emits a valid receipt or artifact reference.

Invalid inference:

```
POURED -> RECEIVER AUTHORIZED
```

Required result:

```
POURED
+
RECEIVER MUST APPLY ITS OWN ADMISSION LAW
```

### H4 — empty interface treated as failure

A BODY entry truthfully declares no stable interfaces.

Invalid inference:

```
EMPTY -> BROKEN
```

Required result:

```
EMPTY
+
PRESENT
+
NO FABRICATED CONTRACT
```

### H5 — historical backfill

A later interface becomes stable.

Invalid inference:

```
INTERFACE EXISTS NOW
->
INTERFACE EXISTED AT EARLIER OCCURRENCE
```

Required result:

```
LATER DECLARATION
+
ATTRIBUTABLE LATER CUT
```

### H6 — centralization by convenience

Several systems begin routing through one server node.

Invalid inference:

```
COMMON ROUTE -> COMMON AUTHORITY
```

Required result:

```
SHARED DOOR
!=
SHARED SOVEREIGN
```

## Minimal future executable witness

A later bounded implementation may model one cycle:

```
arrival
  -> receive receipt
  -> admission result
  -> optional hold reference
  -> explicit pour attempt
  -> outbound receipt
```

A first executable proof should demonstrate:

1. a received item can be refused without disappearing;
2. a held item remains origin-attributed and non-owned;
3. a poured item does not create receiver admission;
4. an empty BODY interface remains valid;
5. replay reconstructs the same local disposition at the same causal cut;
6. no step manufactures authority.

This ADR does not itself implement that runtime.

## Compost / Jubilee reading

The architecture may be used by higher-level projects as a composition metaphor:

```
RECEIVE
  contributions / fragments / residues

HOLD
  provenance / unresolved difference / continuity

POUR
  bounded nourishment / references / transformed outputs
```

That narrative layer does not alter the runtime contract.

The technical law remains:

> **The node is a door and vessel, not a sovereign source.**

## Seal

```
RECEIVE.
HOLD.
POUR.

THE IN DOOR DOES NOT MAKE THE FOREIGN LOCAL.

THE HOLD DOES NOT MAKE THE HELD OWNED.

THE OUT DOOR DOES NOT MAKE THE RECEIVER OBLIGED.

THE SERVER IS A PLACE CONSEQUENCE MAY CROSS,
NOT THE PLACE ALL CONSEQUENCE BELONGS.
```
