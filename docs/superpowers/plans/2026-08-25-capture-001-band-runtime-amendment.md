# CAPTURE-001 Band Runtime Plan Amendment — Single Occurrence Clock

**Status:** normative mechanical correction before implementation.

Band Runtime already carries the canonical occurrence time in `BaseEvent.timestamp`. Do not duplicate that same UTC occurrence inside witness payloads as `observedAtUtc` or `occurredAtUtc`.

Apply these corrections to `2026-08-25-capture-001-band-runtime.md`:

1. `BaseEvent.timestamp` is the canonical UTC occurrence time for all four witness events.
2. `capture.recorded` may carry `localObservedAt: string | null` as human-side local-time evidence. It must not duplicate UTC time in payload.
3. `handoff.recorded`, `return.recorded`, and `decision.recorded` do not carry a second occurrence timestamp in payload.
4. Payload shapes are exactly:

```ts
CaptureRecordedEvent.payload = {
  actorId: string;
  material: WitnessMaterial;
  intent: string | null;
  localObservedAt: string | null;
  parentCaptureId: string | null;
};

HandoffRecordedEvent.payload = {
  actorId: string;
  sourceCaptureIds: string[];
  destination: string;
  outbound: OutboundSnapshot;
  delivery: DeliveryEvidence;
};

ReturnRecordedEvent.payload = {
  actorId: string;
  provider: string;
  providerArtifactId: string | null;
  observed: ObservedReturn;
  relation: ReturnRelation;
};

DecisionRecordedEvent.payload = {
  actorId: string;
  returnId: string;
  decision: 'KEEP' | 'REFUSE' | 'WRONG' | 'INTERESTING';
  note: string | null;
};
```

5. `ObservedReturn` holds provider-visible result evidence, not Vault authority:

```ts
export type ObservedReturn = {
  text?: string;
  artifactRef?: string;
  metadata?: Record<string, unknown>;
};
```

6. Runtime validators validate the payload shape above plus the existing event envelope; they do not require duplicate timestamp strings.
7. Groove Rooms must map its database `created_at` to the runtime occurrence timestamp when projecting/replaying a row into Band Runtime semantics.

This amendment removes a dual-clock ambiguity and aligns the runtime contract with the Groove Rooms payload alignment amendment.