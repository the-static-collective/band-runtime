# Band Runtime Vertical Slice Note: Participant Interruption

In accordance with the first vertical slice specification and domain constraints, **participant interruption is strictly modeled as an observable process resumption rather than via a new ontological event** (such as inventing a `participant.left` or `participant.interrupted` event).

## Why?
1. **Append-Only Sovereignty:** An interruption or network disconnection is a local observation by the transport or runtime instance, not an active domain proposal by the participant. Forcing a domain event for network loss conflates transport realities with the immutable causal history.
2. **Minimal Ontology:** Project0 ontology expansion is expressly forbidden. We do not invent new lifecycle hooks unless absolutely required for causal modeling.
3. **Restoration Mechanics:** By killing the runtime instance and subsequently deserializing from the historical event field (`EventStore.deserialize`), the system guarantees continuity identically. The *absence* of real-time presence—combined with the later *continuation* via sequence alignment—fully and accurately models the interruption without polluting the domain vocabulary.

## Lifecycle distinct from Subjective Receipts
Additionally, it is explicitly noted that `clip.rejected` represents a deterministic clip lifecycle boundary, whereas `recognition.recorded` is a subjective participant receipt. Though both influence the derived runtime state (`ProjectionState`), they are fundamentally distinct in meaning and consequence and must never be conflated.
