# Architecture

## Runtime boundary

Band Runtime hosts a shared encounter. It does not decide what an encounter means, grant capability, canonize a mix, or rewrite the past.

```text
Project0 laws ────────► Band Runtime admission + receipt profile
TranchNode continuity ─► addressed event/import-export compatibility
Corpus OS artifacts ───► declared historical references
MCP clients ───────────► bounded proposal instruments
Browser room ──────────► visible living projection
```

## Four separations

1. **Causal time vs playback time**  
   The monotonic accepted-event sequence decides what could influence what. The transport arranges a projection for listening. Wall-clock time is evidence, never authority.

2. **Immutable strata vs living projection**  
   Events and artifacts append. A projection is a disposable deterministic view of events through an explicit causal cut and policy.

3. **Channel vs mix**  
   Channels retain participant identity, scope, disclosure policy, mute/refusal, and recoverable stem. A mix is a derived artifact with provenance—not a canonical account.

4. **Proposal vs recognition**  
   Agents and anticipation deposit proposals. Attributable recognition may change later projection policy; it cannot rewrite earlier replay.

## Planned local v0.1

- TypeScript local Node service;
- append-only SQLite event store;
- content-addressed local artifact directory;
- pure deterministic session reducer;
- browser room via local WebSocket/SSE updates;
- narrow local MCP server;
- deterministic WAV-stem mix renderer;
- exported receipt bundle.

Storage and UI are replaceable. The event, replay, and export contracts are not.

## Projection honesty

Every rendering must declare:

- exact causal cut;
- projection policy identity and hash;
- admitted/rejected/withheld state;
- foreignness and silence controls;
- input artifact identities;
- disclosure outcome.

A projection without these declarations fails closed.

## Foreignness membrane

The runtime must preserve routes beyond the dominant attractor:

- suppress dominant contour;
- admit a rejected or low-confidence branch;
- sample an unexplored corpus region;
- introduce a provenance-distinct outside artifact;
- create a protected-silence interval where anticipation is forbidden.

Seeded randomness is recorded as event data, never hidden convenience.
